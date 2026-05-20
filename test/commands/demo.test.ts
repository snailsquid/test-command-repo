import { describe, it, expect } from "bun:test";
import { echoCommand, remindCommand, translateCommand } from "../../src/commands/demo";
import type { CommandContext } from "../../src/types";

describe("Demo Commands", () => {
  describe("echoCommand", () => {
    it("should echo back message", async () => {
      const messages: string[] = [];
      const ctx: CommandContext = {
        send: async (text: string) => { messages.push(text); },
        react: async () => {},
        schedule: async () => {},
        fetch: async () => new Response(),
        userId: "test-user",
        args: ["Hello", "World"],
        message: ".echo Hello World",
        contactId: 1,
      };

      await echoCommand.handle(ctx);
      expect(messages).toContain("Hello World");
    });

    it("should handle empty args", async () => {
      const messages: string[] = [];
      const ctx: CommandContext = {
        send: async (text: string) => { messages.push(text); },
        react: async () => {},
        schedule: async () => {},
        fetch: async () => new Response(),
        userId: "test-user",
        args: [],
        message: ".echo",
        contactId: 1,
      };

      await echoCommand.handle(ctx);
      expect(messages).toContain("You didn't say anything!");
    });
  });

  describe("remindCommand", () => {
    it("should show usage on missing duration", async () => {
      const messages: string[] = [];
      const ctx: CommandContext = {
        send: async (text: string) => { messages.push(text); },
        react: async () => {},
        schedule: async () => {},
        fetch: async () => new Response(),
        userId: "test-user",
        args: [],
        message: ".remind me",
        contactId: 1,
      };

      await remindCommand.handle(ctx);
      expect(messages[0]).toContain("Usage:");
    });

    it("should set reminder with message", async () => {
      const messages: string[] = [];
      let scheduled = false;
      const ctx: CommandContext = {
        send: async (text: string) => { messages.push(text); },
        react: async () => {},
        schedule: async (duration: string, callback: () => Promise<void>) => {
          scheduled = true;
          expect(duration).toBe("10m");
        },
        fetch: async () => new Response(),
        userId: "test-user",
        args: ["me", "10m", "check", "email"],
        message: ".remind me 10m check email",
        contactId: 1,
      };

      await remindCommand.handle(ctx);
      expect(scheduled).toBe(true);
      expect(messages[0]).toContain("I'll remind you in 10m");
    });

    it("should use default message when not provided", async () => {
      const messages: string[] = [];
      let scheduled = false;
      const ctx: CommandContext = {
        send: async (text: string) => { messages.push(text); },
        react: async () => {},
        schedule: async (duration: string, callback: () => Promise<void>) => {
          scheduled = true;
        },
        fetch: async () => new Response(),
        userId: "test-user",
        args: ["me", "5m"],
        message: ".remind me 5m",
        contactId: 1,
      };

      await remindCommand.handle(ctx);
      expect(scheduled).toBe(true);
    });
  });

  describe("translateCommand", () => {
    it("should show usage on missing args", async () => {
      const messages: string[] = [];
      const ctx: CommandContext = {
        send: async (text: string) => { messages.push(text); },
        react: async () => {},
        schedule: async () => {},
        fetch: async () => new Response(),
        userId: "test-user",
        args: [],
        message: ".translate",
        contactId: 1,
      };

      await translateCommand.handle(ctx);
      expect(messages[0]).toContain("Usage:");
    });

    it("should show usage on missing language", async () => {
      const messages: string[] = [];
      const ctx: CommandContext = {
        send: async (text: string) => { messages.push(text); },
        react: async () => {},
        schedule: async () => {},
        fetch: async () => new Response(),
        userId: "test-user",
        args: ["hello"],
        message: ".translate hello",
        contactId: 1,
      };

      await translateCommand.handle(ctx);
      expect(messages[0]).toContain("Usage:");
    });

    it("should acknowledge translation request", async () => {
      const messages: string[] = [];
      const ctx: CommandContext = {
        send: async (text: string) => { messages.push(text); },
        react: async () => {},
        schedule: async () => {},
        fetch: async () => new Response(),
        userId: "test-user",
        args: ["hello", "world", "spanish"],
        message: ".translate hello world spanish",
        contactId: 1,
      };

      await translateCommand.handle(ctx);
      expect(messages[0]).toContain("Translating");
      expect(messages[0]).toContain("hello world");
      expect(messages[0]).toContain("spanish");
    });
  });
});
