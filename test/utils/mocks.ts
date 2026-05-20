import { WahaClient } from "../../src/gateway/waha-client";

/**
 * Mock WahaClient for testing
 */
export class MockWahaClient extends WahaClient {
  public sentMessages: Array<{ chatId: string; text: string }> = [];
  public reactions: Array<{ messageId: string; chatId: string; emoji: string }> = [];
  public healthStatus: boolean = true;

  constructor() {
    super("http://mock", "test-session");
  }

  async sendMessage(chatId: string, text: string): Promise<{ messageId: string }> {
    this.sentMessages.push({ chatId, text });
    return { messageId: `msg-${Date.now()}` };
  }

  async sendReaction(messageId: string, chatId: string, emoji: string): Promise<void> {
    this.reactions.push({ messageId, chatId, emoji });
  }

  async removeReaction(messageId: string, chatId: string, emoji: string): Promise<void> {
    const idx = this.reactions.findIndex(
      (r) => r.messageId === messageId && r.chatId === chatId && r.emoji === emoji
    );
    if (idx !== -1) {
      this.reactions.splice(idx, 1);
    }
  }

  async checkHealth(): Promise<boolean> {
    return this.healthStatus;
  }

  reset(): void {
    this.sentMessages = [];
    this.reactions = [];
    this.healthStatus = true;
  }
}

/**
 * Mock fetch for testing
 */
export function createMockFetch(responses: Map<string, any>) {
  return async (url: string, options?: RequestInit): Promise<Response> => {
    const response = responses.get(url);
    if (response) {
      return {
        ok: response.ok ?? true,
        status: response.status ?? 200,
        statusText: response.statusText ?? "OK",
        json: async () => response.data,
        text: async () => JSON.stringify(response.data),
      } as Response;
    }
    return {
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ error: "Not found" }),
      text: async () => "Not Found",
    } as Response;
  };
}

/**
 * Create a test user data factory
 */
export function createTestUser(overrides: Partial<{ phoneJid: string; anonymizedId: string }> = {}) {
  return {
    phoneJid: overrides.phoneJid ?? `user-${Date.now()}@c.us`,
    anonymizedId: overrides.anonymizedId ?? `anon-${Date.now()}`,
  };
}

/**
 * Create a test contact data factory
 */
export function createTestContact(overrides: Partial<{ name: string; phoneNumber: string; wahaSessionId: string }> = {}) {
  return {
    name: overrides.name ?? "Test Contact",
    phoneNumber: overrides.phoneNumber ?? `+1234567890`,
    wahaSessionId: overrides.wahaSessionId ?? `session-${Date.now()}`,
  };
}

/**
 * Create a test developer data factory
 */
export function createTestDeveloper(overrides: Partial<{ username: string; whatsappJid?: string }> = {}) {
  return {
    username: overrides.username ?? `dev-${Date.now()}`,
    whatsappJid: overrides.whatsappJid,
  };
}

/**
 * Create a test command data factory
 */
export function createTestCommand(overrides: Partial<{
  developerId: number;
  slug: string;
  name: string;
  description: string;
  usage: string;
  repoUrl: string;
  entryPoint: string;
  manifestVersion: string | null;
  status: string;
}> = {}) {
  const timestamp = Date.now();
  return {
    developerId: overrides.developerId ?? 1,
    slug: overrides.slug ?? `cmd-${timestamp}`,
    name: overrides.name ?? "Test Command",
    description: overrides.description ?? "A test command",
    usage: overrides.usage ?? ".test [args]",
    repoUrl: overrides.repoUrl ?? "https://github.com/test/repo",
    entryPoint: overrides.entryPoint ?? "index.ts",
    manifestVersion: overrides.manifestVersion ?? null,
    status: overrides.status ?? "active",
  };
}
