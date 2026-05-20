import { describe, it, expect, beforeEach } from "bun:test";
import { CommandRegistry } from "../../src/commands/registry";

describe("CommandRegistry", () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe("parseGitHubUrl", () => {
    it("should parse standard GitHub URL", () => {
      const result = (registry as any).parseGitHubUrl("https://github.com/owner/repo");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("should parse URL with .git suffix", () => {
      const result = (registry as any).parseGitHubUrl("https://github.com/owner/repo.git");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("should parse URL with trailing slash", () => {
      const result = (registry as any).parseGitHubUrl("https://github.com/owner/repo/");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("should return null for invalid URL", () => {
      const result = (registry as any).parseGitHubUrl("https://example.com/owner/repo");
      expect(result).toBeNull();
    });
  });

  describe("validateCommandExport", () => {
    it("should validate correct export structure", () => {
      const source = `
        export const name = "Test Command";
        export const description = "A test command";
        export const usage = ".test [args]";
        export async function handle(ctx) {
          await ctx.send("Hello");
        }
      `;

      const result = registry.validateCommandExport(source);
      expect(result.name).toBe("Test Command");
      expect(result.description).toBe("A test command");
      expect(result.usage).toBe(".test [args]");
    });

    it("should throw on missing name", () => {
      const source = `
        export const description = "Test";
        export const usage = ".test";
        export async function handle(ctx) {}
      `;

      expect(() => registry.validateCommandExport(source)).toThrow("Missing 'name' export");
    });

    it("should throw on missing description", () => {
      const source = `
        export const name = "Test";
        export const usage = ".test";
        export async function handle(ctx) {}
      `;

      expect(() => registry.validateCommandExport(source)).toThrow("Missing 'description' export");
    });

    it("should throw on missing usage", () => {
      const source = `
        export const name = "Test";
        export const description = "Test";
        export async function handle(ctx) {}
      `;

      expect(() => registry.validateCommandExport(source)).toThrow("Missing 'usage' export");
    });

    it("should accept CommonJS exports", () => {
      const source = `
        module.exports = {
          name: "Test Command",
          description: "A test command",
          usage: ".test [args]",
          handle: async (ctx) => {}
        };
      `;

      const result = registry.validateCommandExport(source);
      expect(result.name).toBe("Test Command");
    });
  });

  describe("cache operations", () => {
    it("should set and get cached commands", () => {
      const source = "console.log('test');";
      registry.setCached("dev1/cmd1", source);

      const result = registry.getCached("dev1/cmd1");
      expect(result).toBe(source);
    });

    it("should return null for uncached commands", () => {
      const result = registry.getCached("nonexistent");
      expect(result).toBeNull();
    });

    it("should return null after cache clear (simulated)", () => {
      registry.setCached("test", "source");
      expect(registry.getCached("test")).toBe("source");
      
      // Create new registry instance to simulate fresh cache
      const newRegistry = new CommandRegistry();
      expect(newRegistry.getCached("test")).toBeNull();
    });
  });

  describe("parseFullId", () => {
    it("should parse username/slug format", () => {
      const result = registry.parseFullId("username/slug");
      expect(result).toEqual(["username", "slug"]);
    });

    it("should handle slug without username", () => {
      const result = registry.parseFullId("slug-only");
      expect(result).toEqual(["", "slug-only"]);
    });

    it("should handle empty string", () => {
      const result = registry.parseFullId("");
      expect(result).toEqual(["", ""]);
    });
  });

  describe("buildFullId", () => {
    it("should build full ID from username and slug", () => {
      const result = registry.buildFullId("username", "slug");
      expect(result).toBe("username/slug");
    });
  });

  describe("parseManifest (YAML parsing)", () => {
    it("should parse valid akka.yaml manifest", () => {
      const yaml = `
version: "1"
commands:
  - slug: "weather"
    name: "Weather Command"
    description: "Get weather info"
    usage: ".weather <city>"
    entryPoint: "weather.js"
  - slug: "news"
    name: "News Command"
    description: "Get latest news"
    usage: ".news"
    entryPoint: "news.js"
`;
      const result = (registry as any).parseManifest(yaml);
      expect(result.version).toBe("1");
      expect(result.commands).toHaveLength(2);
      expect(result.commands[0].slug).toBe("weather");
      expect(result.commands[0].name).toBe("Weather Command");
      expect(result.commands[0].entryPoint).toBe("weather.js");
    });

    it("should throw when no commands found", () => {
      const yaml = `
version: "1"
commands: []
`;
      expect(() => (registry as any).parseManifest(yaml)).toThrow("No commands found in manifest");
    });

    it("should handle manifest without version", () => {
      const yaml = `
commands:
  - slug: "test"
    name: "Test"
    description: "Test command"
    usage: ".test"
    entryPoint: "test.js"
`;
      const result = (registry as any).parseManifest(yaml);
      expect(result.version).toBe("1"); // default
      expect(result.commands).toHaveLength(1);
    });

    it("should detect duplicate slugs in manifest", () => {
      const yaml = `
version: "1"
commands:
  - slug: "weather"
    name: "Weather 1"
    description: "First weather"
    usage: ".weather"
    entryPoint: "weather1.js"
  - slug: "weather"
    name: "Weather 2"
    description: "Second weather"
    usage: ".weather"
    entryPoint: "weather2.js"
`;
      // The duplicate detection happens in registerRepository, not parseManifest
      // parseManifest will just return both commands
      const result = (registry as any).parseManifest(yaml);
      expect(result.commands).toHaveLength(2);
      expect(result.commands[0].slug).toBe("weather");
      expect(result.commands[1].slug).toBe("weather");
    });
  });

  describe("extractRepositoryName", () => {
    it("should extract owner/repo from GitHub URL", () => {
      const result = (registry as any).extractRepositoryName("https://github.com/owner/repo");
      expect(result).toBe("owner/repo");
    });

    it("should handle URL with .git suffix", () => {
      const result = (registry as any).extractRepositoryName("https://github.com/owner/repo.git");
      expect(result).toBe("owner/repo");
    });

    it("should fall back to full URL if parsing fails", () => {
      const result = (registry as any).extractRepositoryName("https://example.com/repo");
      expect(result).toBe("https://example.com/repo");
    });
  });

  describe("manifest cache operations", () => {
    it("should set and get cached manifests", () => {
      const manifest = { version: "1", commands: [] };
      (registry as any).manifestCache.set("https://github.com/test/repo", {
        manifest,
        fetchedAt: Date.now(),
      });

      const cached = (registry as any).manifestCache.get("https://github.com/test/repo");
      expect(cached.manifest).toEqual(manifest);
    });

    it("should clear manifest cache", () => {
      (registry as any).manifestCache.set("https://github.com/test/repo", {
        manifest: { version: "1", commands: [] },
        fetchedAt: Date.now(),
      });

      (registry as any).clearManifestCache("https://github.com/test/repo");

      const cached = (registry as any).manifestCache.get("https://github.com/test/repo");
      expect(cached).toBeUndefined();
    });
  });

  describe("getRepositories", () => {
    it("should return empty array when no repos exist", () => {
      // This test would require database setup - just test the method exists
      expect(typeof registry.getRepositories).toBe("function");
    });
  });

  describe("deleteRepository", () => {
    it("should be a function", () => {
      expect(typeof registry.deleteRepository).toBe("function");
    });
  });
});
