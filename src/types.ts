// Core platform types shared across all modules

export interface WebhookPayload {
  sessionId: string;
  senderJid: string;
  messageId: string;
  body: string;
  timestamp: number;
  /** Whether this message came from a group chat */
  isGroupChat: boolean;
  /** The group JID if from a group chat */
  groupJid?: string;
}

export interface WahaClient {
  sendMessage(chatId: string, text: string): Promise<{ messageId: string }>;
  sendReaction(messageId: string, chatId: string, emoji: string): Promise<void>;
  removeReaction(messageId: string, chatId: string, emoji: string): Promise<void>;
}

export interface UserRecord {
  id: number;
  phoneJid: string;
  anonymizedId: string;
  createdAt: string;
}

export interface CommandRecord {
  id: number;
  developerId: number;
  slug: string;
  name: string;
  description: string;
  usage: string;
  repoUrl: string;
  entryPoint: string;
  manifestVersion: string | null;
  status: "active" | "disabled" | "pending";
}

/**
 * Command with developer info for marketplace display
 */
export interface CommandWithDeveloper extends CommandRecord {
  developerUsername: string;
  repositoryName: string;
}

/**
 * Akka manifest file format (akka.yaml)
 * Each command in the manifest defines a WhatsApp command
 */
export interface AkkaManifest {
  /** Manifest version for tracking */
  version: string;
  /** List of commands defined in this repository */
  commands: AkkaCommand[];
}

/**
 * Single command definition in the manifest
 */
export interface AkkaCommand {
  /** Command slug (unique within repository) */
  slug: string;
  /** Human-readable command name */
  name: string;
  /** Command description */
  description: string;
  /** Usage instructions */
  usage: string;
  /** Path to the command entry point file */
  entryPoint: string;
}

export interface InstallationRecord {
  id: number;
  userId: number;
  contactId: number;
  commandId: number;
  userSlug: string;
  installedAt: string;
}

export interface CommandContext {
  send(text: string): Promise<void>;
  react(emoji: string): Promise<void>;
  schedule(duration: string, callback: () => Promise<void>): Promise<void>;
  fetch(url: string, options?: RequestInit): Promise<Response>;
  readonly userId: string;
  readonly args: string[];
  readonly message: string;
  readonly contactId: number;
}

export interface CommandDefinition {
  name: string;
  description: string;
  usage: string;
  handle(ctx: CommandContext): Promise<void>;
}

export interface ConversationFlow {
  id: number;
  userId: number;
  contactId: number;
  flowType: string;
  state: string;
  data: Record<string, unknown>;
  expiresAt: string;
}

export interface ScheduledTask {
  id: number;
  userId: number;
  contactId: number;
  commandSlug: string;
  payload: string;
  executeAt: string;
  status: "pending" | "executed" | "failed";
}
