import { db, schema } from "../db";
import { eq, and } from "drizzle-orm";
import { commandRegistry } from "./registry";
import { userService } from "../router/user-service";

const PAGE_SIZE = 5;

interface MarketplaceState {
  page: number;
  totalPages: number;
  commands: Array<{ id: number; fullId: string; name: string; description: string; slug: string; repositoryName: string; installed: boolean }>;
  awaitingCollision?: {
    newCommandId: number;
    newSlug: string;
    conflictSlug: string;
    existingDevSlug: string;
  };
}

/**
 * 10.1-10.6 Marketplace handler
 * Manages the marketplace conversation flow
 */
export class MarketplaceHandler {
  /**
   * Start marketplace flow - show first page
   */
  async showPage(userId: number, contactId: number, page: number = 1): Promise<string> {
    const allCommands = commandRegistry.getAllActiveCommands();
    const userInstalls = userService.getUserInstallations(userId, contactId);
    const installedSlugs = new Set(userInstalls.map((i) => i.userSlug));

    const totalPages = Math.ceil(allCommands.length / PAGE_SIZE) || 1;
    const safePage = Math.max(1, Math.min(page, totalPages));
    const start = (safePage - 1) * PAGE_SIZE;
    const pageCommands = allCommands.slice(start, start + PAGE_SIZE);

    const items = pageCommands.map((cmd, i) => {
      const fullId = commandRegistry.buildFullId(cmd.developerUsername, cmd.slug);
      const installed = installedSlugs.has(cmd.slug);
      const prefix = installed ? "✅ " : "";
      // 6.1 Display format: {slug} | {description}
      // 6.2 Second line: {developer}/{repository}
      return `${start + i + 1}. ${prefix}*${fullId}* — ${cmd.description}\n   _${cmd.repositoryName}_`;
    });

    let text = `🛒 *Marketplace* (Page ${safePage}/${totalPages})\n\n`;
    text += items.join("\n\n");

    const nav: string[] = [];
    if (safePage < totalPages) nav.push('Reply "n" for next page');
    if (safePage > 1) nav.push('Reply "p" for previous');
    nav.push("Reply a number to install");
    text += `\n\n_${nav.join(" • ")}_`;

    return text;
  }

  /**
   * Handle a marketplace flow response
   */
  async handleResponse(
    userId: number,
    contactId: number,
    response: string,
    currentState: MarketplaceState,
    wahaClient: { sendMessage: (jid: string, text: string) => Promise<unknown> },
    userJid: string
  ): Promise<{ completed: boolean; message: string; newState?: MarketplaceState }> {
    const input = response.trim().toLowerCase();

    // Navigation
    if (input === "n") {
      const newPage = currentState.page + 1;
      if (newPage > currentState.totalPages) {
        return { completed: false, message: "You're on the last page.", newState: currentState };
      }
      const text = await this.showPage(userId, contactId, newPage);
      return { completed: false, message: text, newState: { ...currentState, page: newPage } };
    }

    if (input === "p") {
      const newPage = currentState.page - 1;
      if (newPage < 1) {
        return { completed: false, message: "You're on the first page.", newState: currentState };
      }
      const text = await this.showPage(userId, contactId, newPage);
      return { completed: false, message: text, newState: { ...currentState, page: newPage } };
    }

    // Handle collision resolution
    if (currentState.awaitingCollision) {
      const collision = currentState.awaitingCollision;
      if (input === "replace") {
        // Uninstall old, install new
        userService.uninstallCommand(userId, contactId, collision.conflictSlug);
        userService.installCommand(userId, contactId, collision.newCommandId, collision.conflictSlug);

        const cmd = commandRegistry.getCommandByFullId(collision.newSlug);
        const usageStr = cmd?.usage || collision.newSlug;
        return {
          completed: true,
          message: `✅ *${collision.newSlug}* installed! Usage: _${usageStr}_`,
        };
      }

      if (input === "new") {
        // Install with incremented slug
        let newSlug = collision.conflictSlug;
        let counter = 1;
        while (userService.isInstalled(userId, contactId, newSlug)) {
          newSlug = `${collision.conflictSlug}${counter}`;
          counter++;
        }

        userService.installCommand(userId, contactId, collision.newCommandId, newSlug);

        const cmd = commandRegistry.getCommandByFullId(collision.newSlug);
        return {
          completed: true,
          message: `✅ *${collision.newSlug}* installed as *.${newSlug}*! Usage: _${cmd?.usage || collision.newSlug}_`,
        };
      }

      return {
        completed: false,
        message: "Please reply 'replace' or 'new'.",
        newState: currentState,
      };
    }

    // 10.2 Text-based selection by number
    const num = parseInt(input, 10);
    if (!isNaN(num) && num > 0) {
      const pageCommands = currentState.commands;
      const selected = pageCommands[num - 1];
      if (!selected) {
        return {
          completed: false,
          message: "Invalid selection. Please reply with a valid number.",
          newState: currentState,
        };
      }

      // Check if already installed
      if (selected.installed) {
        return {
          completed: true,
          message: `*${selected.fullId}* is already installed. Send _.help_ to see your commands.`,
        };
      }

      // Get the command record
      const cmdRecord = commandRegistry.getCommandByFullId(selected.fullId);
      if (!cmdRecord) {
        return { completed: true, message: "Command not found in registry." };
      }

      // 10.5 Check for slug collision
      if (userService.isInstalled(userId, contactId, selected.slug)) {
        const existingInstall = userService.getInstallation(userId, contactId, selected.slug);
        const existingCmd = existingInstall
          ? db.select().from(schema.commands).where(eq(schema.commands.id, existingInstall.commandId)).get()
          : null;
        const existingDev = existingCmd
          ? db.select().from(schema.developers).where(eq(schema.developers.id, existingCmd.developerId)).get()
          : null;

        const collisionState: MarketplaceState = {
          ...currentState,
          awaitingCollision: {
            newCommandId: cmdRecord.id,
            newSlug: selected.fullId,
            conflictSlug: selected.slug,
            existingDevSlug: `${existingDev?.username || "?"}/${selected.slug}`,
          },
        };

        return {
          completed: false,
          message:
            `You already have *.${selected.slug}* installed (${collisionState.awaitingCollision?.existingDevSlug}).\n\n` +
            `Replace with *${selected.fullId}*, or install as *.${selected.slug}1*?\n` +
            `_Reply 'replace' or 'new'_`,
          newState: collisionState,
        };
      }

      // 10.4 Install with confirmation
      userService.installCommand(userId, contactId, cmdRecord.id, selected.slug);
      return {
        completed: true,
        message: `✅ *${selected.fullId}* installed! Usage: _${cmdRecord.usage}_`,
      };
    }

    // Unknown input
    return {
      completed: false,
      message: "Reply with a number to install, 'n' for next page, or 'p' for previous.",
      newState: currentState,
    };
  }

  /**
   * Build initial marketplace state
   */
  async buildInitialState(userId: number, contactId: number): Promise<MarketplaceState> {
    const allCommands = commandRegistry.getAllActiveCommands();
    const userInstalls = userService.getUserInstallations(userId, contactId);
    const installedSlugs = new Set(userInstalls.map((i) => i.userSlug));

    const totalPages = Math.ceil(allCommands.length / PAGE_SIZE) || 1;
    const pageCommands = allCommands.slice(0, PAGE_SIZE).map((cmd, i) => ({
      id: cmd.id,
      fullId: commandRegistry.buildFullId(cmd.developerUsername, cmd.slug),
      name: cmd.name,
      description: cmd.description,
      slug: cmd.slug,
      repositoryName: cmd.repositoryName,
      installed: installedSlugs.has(cmd.slug),
    }));

    return { page: 1, totalPages, commands: pageCommands };
  }
}

// Singleton
export const marketplaceHandler = new MarketplaceHandler();
