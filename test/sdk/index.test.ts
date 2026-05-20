import { describe, it, expect } from "bun:test";
import { command, type CommandContext, type CommandDefinition } from "../../src/commands/sdk";

describe("SDK", () => {
  describe("command helper", () => {
    it("should create valid command definition", () => {
      const def = command({
        name: "Test Command",
        description: "A test command",
        usage: ".test [args]",
        async handle(ctx: CommandContext) {
          await ctx.send("Hello");
        },
      });

      expect(def.name).toBe("Test Command");
      expect(def.description).toBe("A test command");
      expect(def.usage).toBe(".test [args]");
      expect(typeof def.handle).toBe("function");
    });

    it("should throw on missing name", () => {
      expect(() =>
        command({
          name: "",
          description: "Test",
          usage: ".test",
          async handle(ctx: CommandContext) {},
        })
      ).toThrow("Command must have a 'name' string");

      expect(() =>
        command({
          description: "Test",
          usage: ".test",
          async handle(ctx: CommandContext) {},
        } as any)
      ).toThrow("Command must have a 'name' string");
    });

    it("should throw on missing description", () => {
      expect(() =>
        command({
          name: "Test",
          description: "",
          usage: ".test",
          async handle(ctx: CommandContext) {},
        })
      ).toThrow("Command must have a 'description' string");
    });

    it("should throw on missing usage", () => {
      expect(() =>
        command({
          name: "Test",
          description: "Test",
          usage: "",
          async handle(ctx: CommandContext) {},
        })
      ).toThrow("Command must have a 'usage' string");
    });

    it("should throw on missing handle function", () => {
      expect(() =>
        command({
          name: "Test",
          description: "Test",
          usage: ".test",
        } as any)
      ).toThrow("Command must have a 'handle' async function");

      expect(() =>
        command({
          name: "Test",
          description: "Test",
          usage: ".test",
          handle: "not a function",
        } as any)
      ).toThrow("Command must have a 'handle' async function");
    });
  });
});
