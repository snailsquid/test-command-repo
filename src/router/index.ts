import { db, schema } from "../db";
import { eq, and, gt } from "drizzle-orm";
import type { WebhookPayload, ConversationFlow, UserRecord } from "../types";
import { userService } from "./user-service";
import { WahaClient } from "../gateway/waha-client";
import { getSessionManager } from "../gateway/session-manager";
import { handleSystemCommand } from "../commands/system";
import { marketplaceHandler } from "../commands/marketplace";
import { commandExecutor } from "../commands/executor";
import { commandRegistry } from "../commands/registry";

// System commands that bypass installation check
const SYSTEM_COMMANDS = new Set(["help", "marketplace", "uninstall", "rename", "login"]);

/**
 * Parsed command result
 */
interface ParsedCommand {
  slug: string;
  args: string[];
  userSlug: string;
}

/**
 * Router - Main message routing and processing
 * Handles command parsing, flow management, and routing to appropriate handlers
 */
export class Router {
  private readonly wahaBaseUrl: string;

  constructor(wahaBaseUrl: string = process.env.WAHA_BASE_URL || "http://localhost:3001") {
    this.wahaBaseUrl = wahaBaseUrl;
  }

  /**
   * Get or create a WahaClient for a contact
   */
  private getClientForContact(contactId: number): WahaClient | null {
    const sessionManager = getSessionManager();
    const sessionInfo = sessionManager.getAllSessions().find((s) => s.contactId === contactId);
    
    if (sessionInfo) {
      return sessionInfo.client;
    }

    // Fallback: create client with session ID from contact
    const contact = db.select().from(schema.contacts).where(eq(schema.contacts.id, contactId)).get();
    if (contact) {
      return new WahaClient(this.wahaBaseUrl, contact.wahaSessionId);
    }

    return null;
  }

  /**
   * Parse a command from message body
   */
  parseCommand(body: string, userId: number, contactId: number): ParsedCommand | null {
    console.log(body)
    const text = body.trim();
    if (!text) return null;

    // Special case: marketplace can be invoked without leading dot
    if (text.toLowerCase() === "marketplace") {
      return { slug: "marketplace", args: [], userSlug: "marketplace" };
    }

    // All other commands require leading dot
    if (!text.startsWith(".")) return null;

    const textAfterDot = text.slice(1).trim();
    if (!textAfterDot) return null;

    // Get all user slugs for this user on this contact
    const userSlugs = userService.getUserSlugs(userId, contactId);

    // Combine user slugs with system commands for matching
    const allSlugs = [...userSlugs, ...Array.from(SYSTEM_COMMANDS)];

    // Try longest matching slug first (for commands with spaces)
    const sortedSlugs = [...allSlugs].sort((a, b) => b.length - a.length);

    for (const slug of sortedSlugs) {
      if (textAfterDot.toLowerCase().startsWith(slug.toLowerCase())) {
        const rest = textAfterDot.slice(slug.length).trim();
        const args = rest ? rest.split(/\s+/).filter((a: string) => a.length > 0) : [];
        return { slug, args, userSlug: slug };
      }
    }

    // Try first word as slug
    const firstSpace = textAfterDot.indexOf(" ");
    const potentialSlug = firstSpace === -1 ? textAfterDot : textAfterDot.slice(0, firstSpace);

    if (allSlugs.some((s) => s.toLowerCase() === potentialSlug.toLowerCase())) {
      const args = firstSpace === -1 ? [] : textAfterDot.slice(firstSpace + 1).split(/\s+/).filter((a: string) => a.length > 0);
      return { slug: potentialSlug, args, userSlug: potentialSlug };
    }

    return null;
  }

  /**
   * Start a conversation flow for a user
   */
  startFlow(userId: number, contactId: number, flowType: string, initialData: Record<string, unknown> = {}): ConversationFlow {
    const expiresAt = new Date(Date.now() + 60000).toISOString();

    db.insert(schema.conversationFlows)
      .values({ userId, contactId, flowType, state: "start", data: JSON.stringify(initialData), expiresAt })
      .run();

    const flows = db.select().from(schema.conversationFlows).where(eq(schema.conversationFlows.userId, userId)).all();
    const flow = flows[flows.length - 1]!;

    return {
      id: flow.id, userId: flow.userId, contactId: flow.contactId,
      flowType: flow.flowType, state: flow.state,
      data: JSON.parse(flow.data), expiresAt: flow.expiresAt,
    };
  }

  /**
   * Get active flow for user on contact
   */
  getActiveFlow(userId: number, contactId: number): ConversationFlow | null {
    const now = new Date().toISOString();
    const flow = db.select().from(schema.conversationFlows)
      .where(and(eq(schema.conversationFlows.userId, userId), eq(schema.conversationFlows.contactId, contactId), gt(schema.conversationFlows.expiresAt, now)))
      .get();
    if (!flow) return null;
    return {
      id: flow.id, userId: flow.userId, contactId: flow.contactId,
      flowType: flow.flowType, state: flow.state,
      data: JSON.parse(flow.data), expiresAt: flow.expiresAt,
    };
  }

  /**
   * End (delete) a conversation flow
   */
endFlow(flowId: number): boolean {
     db.delete(schema.conversationFlows).where(eq(schema.conversationFlows.id, flowId)).run();
     return true;
   }

  /**
   * Check if user is in an active flow
   */
  isInFlow(userId: number, contactId: number): boolean {
    return this.getActiveFlow(userId, contactId) !== null;
  }

  /**
   * Update flow state and data
   */
  updateFlow(flowId: number, state: string, data: Record<string, unknown>, extendSeconds: number = 60): void {
    const expiresAt = new Date(Date.now() + extendSeconds * 1000).toISOString();
    db.update(schema.conversationFlows).set({ state, data: JSON.stringify(data), expiresAt }).where(eq(schema.conversationFlows.id, flowId)).run();
  }

  /**
   * Handle an incoming message
   */
  async handleIncomingMessage(payload: WebhookPayload, contactId: number): Promise<void> {
    console.log(payload)
    const { senderJid, messageId, body } = payload;
    const client = this.getClientForContact(contactId);
    if (!client) { console.error(`[Router] No client for contact ${contactId}`); return; }

    const user = userService.getOrCreateUser(senderJid);
    const userId = user.id;

    // Check conversation flow
    const activeFlow = this.getActiveFlow(userId, contactId);
    if (activeFlow) {
      await this.handleFlowMessage(client, senderJid, messageId, body, userId, contactId, activeFlow);
      return;
    }

    // Parse command
    const command = this.parseCommand(body, userId, contactId);
    if (!command) return;

    console.log(`[Router] Command: ${command.slug} args: ${command.args.join(", ")}`);

    // React loading
    await client.sendReaction(messageId, senderJid, "\u23F3");

    try {
      const isSystem = SYSTEM_COMMANDS.has(command.slug.toLowerCase());
      const isInstalled = userService.isInstalled(userId, contactId, command.slug);

      if (isSystem) {
        // Wire to real system command handler
        await handleSystemCommand(command.slug.toLowerCase(), {
          userId, contactId, userJid: senderJid, wahaClient: client, args: command.args, messageId,
        }, async (uid, cid) => {
          // Start marketplace flow with full initial state and show first page
          const initialState = await marketplaceHandler.buildInitialState(uid, cid);
          this.startFlow(uid, cid, "marketplace", initialState as unknown as Record<string, unknown>);
          return marketplaceHandler.showPage(uid, cid);
        });
      } else if (isInstalled) {
        // Wire to real command executor
        await this.executeCommandCmd(client, senderJid, messageId, userId, contactId, command);
      } else {
        await client.sendMessage(senderJid, "❌ Command not installed. Use .marketplace to browse.");
      }

      await client.removeReaction(messageId, senderJid, "\u23F3");
      await client.sendReaction(messageId, senderJid, "✅");
    } catch (error) {
      console.error(`[Router] Error:`, error);
      await client.removeReaction(messageId, senderJid, "\u23F3");
      await client.sendReaction(messageId, senderJid, "❌");
      await client.sendMessage(senderJid, "❌ Something went wrong. The command may have an error.");
    }
  }

  /**
   * Execute an installed command via sandbox
   */
  private async executeCommandCmd(
    client: WahaClient, senderJid: string, messageId: string,
    userId: number, contactId: number, command: ParsedCommand
  ): Promise<void> {
    const user = userService.findById(userId);
    const installation = userService.getInstallationByUserSlug(userId, contactId, command.slug);
    if (!installation) {
      await client.sendMessage(senderJid, "Command not found in your installations.");
      return;
    }

    const cmdRecord = db.select().from(schema.commands).where(eq(schema.commands.id, installation.commandId)).get();
    if (!cmdRecord) {
      await client.sendMessage(senderJid, "Command record not found.");
      return;
    }

    // Get cached source
    let source = commandRegistry.getCommandSource(cmdRecord.developerId, cmdRecord.slug);
    if (!source) {
      // Fetch and cache
      try {
        source = await commandRegistry.fetchCommandRepo(cmdRecord.repoUrl, cmdRecord.entryPoint);
        commandRegistry.setCached(`${cmdRecord.developerId}/${cmdRecord.slug}`, source);
      } catch {
        await client.sendMessage(senderJid, "❌ Failed to load command code. The repository may be unavailable.");
        return;
      }
    }

    // Create execution context
    const ctx = commandExecutor.createExecutionContext(
      async (text) => { await client.sendMessage(senderJid, text); },
      async (emoji) => { await client.sendReaction(messageId, senderJid, emoji); },
      async (_duration, _callback) => {
        // Schedule is wired to scheduler (stub for now)
        await client.sendMessage(senderJid, "⏰ Scheduler not yet wired. Coming soon!");
      },
      user?.anonymizedId || "unknown",
      command.args,
      command.args.join(" ") ? `.${command.slug} ${command.args.join(" ")}` : `.${command.slug}`,
      contactId
    );

    // Execute in sandbox
    const result = await commandExecutor.executeCommand(source, ctx);
    if (!result.success && result.error) {
      await client.sendMessage(senderJid, `❌ ${result.error}`);
    }
  }

  /**
   * Handle messages from users in a conversation flow
   */
  private async handleFlowMessage(
    client: WahaClient, senderJid: string, messageId: string, body: string,
    userId: number, contactId: number, flow: ConversationFlow
  ): Promise<void> {
    console.log(`[Router] Flow message for flow ${flow.id}, type: ${flow.flowType}, state: ${flow.state}`);

    // Marketplace flow
    if (flow.flowType === "marketplace" || flow.flowType === "start") {
      let state = flow.data as unknown as { page: number; totalPages: number; commands: unknown[]; awaitingCollision?: unknown };
      if (!state.page) {
        state = await marketplaceHandler.buildInitialState(userId, contactId);
      }

      const result = await marketplaceHandler.handleResponse(userId, contactId, body, {
        page: state.page,
        totalPages: state.totalPages,
        commands: state.commands as Array<{ id: number; fullId: string; name: string; description: string; slug: string; repositoryName: string; installed: boolean }>,
        awaitingCollision: state.awaitingCollision as { newCommandId: number; newSlug: string; conflictSlug: string; existingDevSlug: string } | undefined,
      }, { sendMessage: async (jid, text) => { await client.sendMessage(jid, text); } }, senderJid);

      if (result.completed) {
        this.endFlow(flow.id);
        await client.sendMessage(senderJid, result.message);
      } else {
        if (result.newState) {
          this.updateFlow(flow.id, "browsing", result.newState as unknown as Record<string, unknown>);
        }
        await client.sendMessage(senderJid, result.message);
      }
    } else {
      // Unknown flow type - end it
      this.endFlow(flow.id);
      await client.sendMessage(senderJid, "Flow ended. Send a command to continue.");
    }
  }
}

// Singleton
let routerInstance: Router | null = null;

export function getRouter(): Router {
  if (!routerInstance) routerInstance = new Router();
  return routerInstance;
}

export const router = getRouter();
