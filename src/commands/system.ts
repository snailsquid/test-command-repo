import type { WahaClient } from "../gateway/waha-client";
import { userService } from "../router/user-service";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";

export const SYSTEM_COMMANDS = new Set(["help", "marketplace", "uninstall", "rename", "login"]);

export interface SystemCommandContext {
  userId: number;
  contactId: number;
  userJid: string;
  wahaClient: WahaClient;
  args: string[];
  messageId: string;
}

/**
 * 9.1 .help command - list installed commands
 */
async function handleHelp(ctx: SystemCommandContext): Promise<void> {
  const installations = userService.getUserInstallations(ctx.userId, ctx.contactId);

  if (installations.length === 0) {
    await ctx.wahaClient.sendMessage(
      ctx.userJid,
      "📚 *Your Commands*\n\nYou have no commands installed.\n\n" +
        "Send *.marketplace* to browse available commands.\n" +
        "Or visit the developer portal to create your own!"
    );
    return;
  }

  const lines = installations.map((inst) => {
    const command = inst.command;
    return (
      `*.${inst.userSlug}* — ${command.description}\n` +
      `  _${command.usage}_`
    );
  });

  await ctx.wahaClient.sendMessage(
    ctx.userJid,
    `📚 *Your Commands* (${installations.length} installed)\n\n` +
      lines.join("\n\n") +
      `\n\n_Send *.marketplace* to browse more._`
  );
}

/**
 * 9.3 .uninstall command - remove an installed command
 */
async function handleUninstall(ctx: SystemCommandContext): Promise<void> {
  const slug = ctx.args[0];

  if (!slug) {
    await ctx.wahaClient.sendMessage(
      ctx.userJid,
      "Usage: *.uninstall <command-name>*\nExample: _.uninstall remind_"
    );
    return;
  }

  const isInstalled = userService.isInstalled(ctx.userId, ctx.contactId, slug);

  if (!isInstalled) {
    await ctx.wahaClient.sendMessage(
      ctx.userJid,
      `Command *.${slug}* is not installed.`
    );
    return;
  }

  const success = userService.uninstallCommand(ctx.userId, ctx.contactId, slug);

  if (success) {
    await ctx.wahaClient.sendMessage(
      ctx.userJid,
      `✅ *.${slug}* has been uninstalled.`
    );
  } else {
    await ctx.wahaClient.sendMessage(
      ctx.userJid,
      `Failed to uninstall *.${slug}*. Please try again.`
    );
  }
}

/**
 * 9.4 .rename command - rename an installed slug
 */
async function handleRename(ctx: SystemCommandContext): Promise<void> {
  const oldSlug = ctx.args[0];
  const newSlug = ctx.args[1];

  if (!oldSlug || !newSlug) {
    await ctx.wahaClient.sendMessage(
      ctx.userJid,
      "Usage: *.rename <old-name> <new-name>*\nExample: _.rename remind my-reminder_"
    );
    return;
  }

  if (!userService.isInstalled(ctx.userId, ctx.contactId, oldSlug)) {
    await ctx.wahaClient.sendMessage(
      ctx.userJid,
      `Command *.${oldSlug}* is not installed.`
    );
    return;
  }

  if (userService.isInstalled(ctx.userId, ctx.contactId, newSlug)) {
    await ctx.wahaClient.sendMessage(
      ctx.userJid,
      `You already have a command named *.${newSlug}*. Please choose a different name.`
    );
    return;
  }

  const success = userService.renameInstallation(ctx.userId, ctx.contactId, oldSlug, newSlug);

  if (success) {
    await ctx.wahaClient.sendMessage(
      ctx.userJid,
      `✅ Renamed *.${oldSlug}* to *.${newSlug}*`
    );
  } else {
    await ctx.wahaClient.sendMessage(
      ctx.userJid,
      "Failed to rename command. Please try again."
    );
  }
}

/**
 * .login command - authenticate developer via WhatsApp
 */
async function handleLogin(ctx: SystemCommandContext): Promise<void> {
  const token = ctx.args[0];

  if (!token) {
    await ctx.wahaClient.sendMessage(
      ctx.userJid,
      "Usage: *.login <token>*\n\nGet your token from the developer dashboard."
    );
    return;
  }

  // Look up the registration token
  const regToken = db.select().from(schema.registrationTokens).where(eq(schema.registrationTokens.token, token)).get();

  if (!regToken) {
    await ctx.wahaClient.sendMessage(
      ctx.userJid,
      "❌ Invalid token. Please get a new token from the developer dashboard."
    );
    return;
  }

  // Check if token is expired
  if (regToken.expiresAt && new Date(regToken.expiresAt) < new Date()) {
    await ctx.wahaClient.sendMessage(
      ctx.userJid,
      "❌ Token expired. Please generate a new token from the developer dashboard."
    );
    return;
  }

  // Check if token has already been used
  if (regToken.used) {
    await ctx.wahaClient.sendMessage(
      ctx.userJid,
      "❌ This token has already been used. Please generate a new token from the developer dashboard."
    );
    return;
  }

  // Check if developerId exists on the token
  if (!regToken.developerId) {
    await ctx.wahaClient.sendMessage(
      ctx.userJid,
      "❌ Invalid token. Please generate a new token from the developer dashboard."
    );
    return;
  }

  // Get the developer
  const developer = db.select().from(schema.developers).where(eq(schema.developers.id, regToken.developerId)).get();
  if (!developer) {
    await ctx.wahaClient.sendMessage(
      ctx.userJid,
      "❌ Developer not found. Please generate a new token from the developer dashboard."
    );
    return;
  }

  // Check if this WhatsApp number is already linked to a different developer
  if (developer.whatsappJid && developer.whatsappJid !== ctx.userJid) {
    // This developer has a different WhatsApp number linked
    await ctx.wahaClient.sendMessage(
      ctx.userJid,
      `❌ This account is already linked to a different WhatsApp number.`
    );
    return;
  }

  // Check if this WhatsApp JID is already linked to a different developer
  const existingLinkedDev = db.select().from(schema.developers).where(eq(schema.developers.whatsappJid, ctx.userJid)).get();
  if (existingLinkedDev && existingLinkedDev.id !== developer.id) {
    await ctx.wahaClient.sendMessage(
      ctx.userJid,
      `❌ This WhatsApp number is already linked to @${existingLinkedDev.username}. If you believe this is an error, please contact support.`
    );
    return;
  }

  // All checks passed — link WhatsApp JID to developer, mark token used, create session
  db.update(schema.developers)
    .set({ whatsappJid: ctx.userJid })
    .where(eq(schema.developers.id, developer.id))
    .run();

  db.update(schema.registrationTokens)
    .set({ used: true })
    .where(eq(schema.registrationTokens.id, regToken.id))
    .run();

  // Create a session token
  const sessionToken = `sess_${crypto.randomUUID().replace(/-/g, "")}`;
  db.insert(schema.sessions).values({
    token: sessionToken,
    developerId: developer.id,
  }).run();

  await ctx.wahaClient.sendMessage(
    ctx.userJid,
    `✅ Login successful! Welcome, @${developer.username}.\n\nYou can now access the developer dashboard.`
  );
}

/**
 * 9.2 .marketplace - delegates to marketplace handler
 */
async function handleMarketplace(
  ctx: SystemCommandContext,
  startFlowFn: (userId: number, contactId: number) => Promise<string>
): Promise<void> {
  const marketplaceText = await startFlowFn(ctx.userId, ctx.contactId);
  await ctx.wahaClient.sendMessage(ctx.userJid, marketplaceText);
}

/**
 * Main system command router
 */
export async function handleSystemCommand(
  slug: string,
  ctx: SystemCommandContext,
  flowStarter?: (userId: number, contactId: number) => Promise<string>
): Promise<{ handled: boolean; message?: string }> {
  switch (slug.toLowerCase()) {
    case "help":
      await handleHelp(ctx);
      return { handled: true };

    case "marketplace":
      if (flowStarter) {
        await handleMarketplace(ctx, flowStarter);
      } else {
        await ctx.wahaClient.sendMessage(
          ctx.userJid,
          "🛒 *Marketplace*\n\nBrowse and install commands from developers.\n\n_Coming soon!_"
        );
      }
      return { handled: true };

    case "login":
      await handleLogin(ctx);
      return { handled: true };

    case "uninstall":
      await handleUninstall(ctx);
      return { handled: true };

    case "rename":
      await handleRename(ctx);
      return { handled: true };

    default:
      return { handled: false, message: "Unknown system command" };
  }
}
