/**
 * @akka/sdk - Akka WhatsApp Command Platform SDK
 * 
 * This is the developer-facing SDK for building commands on the Akka platform.
 * Commands built with this SDK can be published to the Akka marketplace.
 * 
 * ## Quick Start
 * 
 * ```typescript
 * import { command } from "@akka/sdk";
 * 
 * export default command({
 *   name: "Echo",
 *   description: "Echoes back your message",
 *   usage: ".echo [text]",
 *   async handle(ctx) {
 *     await ctx.send(ctx.args.join(" ") || "Hello from Akka!");
 *   }
 * });
 * ```
 */

/**
 * Context object available to command handlers.
 * Injected by the platform at execution time.
 */
export interface CommandContext {
  /** Send a text message to the user */
  send(text: string): Promise<void>;
  /** React with an emoji on the user's message */
  react(emoji: string): Promise<void>;
  /** Schedule a callback for delayed execution (e.g. "10m", "2h", "30s") */
  schedule(duration: string, callback: () => Promise<void>): Promise<void>;
  /** Make HTTP requests to external servers */
  fetch(url: string, options?: RequestInit): Promise<Response>;
  /** Anonymized user ID (not the phone number) */
  readonly userId: string;
  /** Arguments passed to the command (after the slug) */
  readonly args: string[];
  /** The full message text */
  readonly message: string;
  /** The contact (phone number) receiving this command */
  readonly contactId: number;
}

/**
 * Definition of an Akka command.
 */
export interface CommandDefinition {
  /** Display name of the command */
  name: string;
  /** Short description shown in marketplace */
  description: string;
  /** Usage string (e.g. ".echo [text]") */
  usage: string;
  /** The command handler function */
  handle(ctx: CommandContext): Promise<void>;
}

/**
 * Helper to define and validate a command.
 * Usage:
 * 
 * ```typescript
 * export default command({
 *   name: "My Command",
 *   description: "Does something useful",
 *   usage: ".mycommand [args]",
 *   async handle(ctx) {
 *     await ctx.send("Hello!");
 *   }
 * });
 * ```
 */
export function command(def: CommandDefinition): CommandDefinition {
  if (!def.name || typeof def.name !== "string") {
    throw new Error("Command must have a 'name' string");
  }
  if (!def.description || typeof def.description !== "string") {
    throw new Error("Command must have a 'description' string");
  }
  if (!def.usage || typeof def.usage !== "string") {
    throw new Error("Command must have a 'usage' string");
  }
  if (typeof def.handle !== "function") {
    throw new Error("Command must have a 'handle' async function");
  }
  return def;
}
