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