import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTestDb, resetTestDb, closeTestDb } from "../utils/test-db";
import { Database } from "bun:sqlite";
import { marketplaceHandler } from "../../src/commands/marketplace";
import { commandRegistry } from "../../src/commands/registry";
import { userService } from "../../src/router/user-service";

// Define MarketplaceState interface locally (not exported in source)
interface MarketplaceState {
  page: number;
  totalPages: number;
  commands: Array<{ id: number; fullId: string; name: string; description: string; slug: string; installed: boolean }>;
  awaitingCollision?: {
    newCommandId: number;
    newSlug: string;
    conflictSlug: string;
    existingDevSlug: string;
  };
}

describe("MarketplaceHandler", () => {
  let sqlite: Database;
  let testUserId: number;
  let testContactId: number;
  let testDeveloperId: number;

  beforeEach(() => {
    const testDb = createTestDb();
    sqlite = testDb.sqlite;

    // Insert test data using raw SQL (following the pattern from user-service.test.ts)
    sqlite.exec("INSERT INTO developers (id, username) VALUES (1, 'testdev')");
    testDeveloperId = 1;

    sqlite.exec("INSERT INTO users (id, phone_jid, anonymized_id) VALUES (1, 'test@c.us', 'test123')");
    testUserId = 1;

    sqlite.exec("INSERT INTO contacts (id, name, phone_number, waha_session_id) VALUES (1, 'Test User', '+1234567890', 'test-session')");
    testContactId = 1;
  });

  afterEach(() => {
    closeTestDb(sqlite);
  });

  describe("showPage", () => {
    // 2.2 - showPage returns first page with commands
    it("showPage returns first page with commands", async () => {
      // Register a command
      await commandRegistry.registerCommand(
        testDeveloperId,
        "test-cmd",
        "Test Command",
        "A test command",
        ".test-cmd",
        "https://github.com/test/repo",
        "index.ts",
        true // skip validation
      );

      const result = await marketplaceHandler.showPage(testUserId, testContactId, 1);

      expect(result).toContain("Marketplace");
      expect(result).toContain("Page 1/1");
      expect(result).toContain("testdev/test-cmd");
      expect(result).toContain("A test command");
    });

    // 2.3 - showPage handles empty marketplace
    it("showPage handles empty marketplace", async () => {
      const result = await marketplaceHandler.showPage(testUserId, testContactId, 1);

      expect(result).toContain("Marketplace");
      expect(result).toContain("Page 1/1");
      // Empty marketplace shows the commands list (which will be empty)
      expect(result).toContain("Reply a number to install");
    });

    // 2.4 - showPage pagination calculates correctly
    it("showPage pagination calculates correctly", async () => {
      // Register 7 commands (5 per page = 2 pages)
      for (let i = 1; i <= 7; i++) {
        await commandRegistry.registerCommand(
          testDeveloperId,
          `cmd${i}`,
          `Command ${i}`,
          `Description ${i}`,
          `.cmd${i}`,
          "https://github.com/test/repo",
          "index.ts",
          true
        );
      }

      const page1 = await marketplaceHandler.showPage(testUserId, testContactId, 1);
      expect(page1).toContain("Page 1/2");

      const page2 = await marketplaceHandler.showPage(testUserId, testContactId, 2);
      expect(page2).toContain("Page 2/2");
    });

    // 2.5 - showPage marks installed commands
    it("showPage marks installed commands", async () => {
      // Register a command
      const cmd = await commandRegistry.registerCommand(
        testDeveloperId,
        "installed-cmd",
        "Installed Command",
        "Already installed",
        ".installed-cmd",
        "https://github.com/test/repo",
        "index.ts",
        true
      );

      // Install the command for the user
      userService.installCommand(testUserId, testContactId, cmd.id, "installed-cmd");

      const result = await marketplaceHandler.showPage(testUserId, testContactId, 1);

      expect(result).toContain("✅");
      expect(result).toContain("installed-cmd");
    });
  });

  describe("handleResponse - Navigation", () => {
    let state: MarketplaceState;

    beforeEach(async () => {
      // Register 7 commands (2 pages)
      for (let i = 1; i <= 7; i++) {
        await commandRegistry.registerCommand(
          testDeveloperId,
          `navcmd${i}`,
          `Nav Command ${i}`,
          `Description ${i}`,
          `.navcmd${i}`,
          "https://github.com/test/repo",
          "index.ts",
          true
        );
      }

      state = await marketplaceHandler.buildInitialState(testUserId, testContactId);
    });

    // 2.6 - handleResponse "n" navigates to next page
    it('handleResponse "n" navigates to next page', async () => {
      const result = await marketplaceHandler.handleResponse(
        testUserId,
        testContactId,
        "n",
        state,
        { sendMessage: async () => {} },
        "test@c.us"
      );

      expect(result.completed).toBe(false);
      expect(result.newState?.page).toBe(2);
      expect(result.message).toContain("Page 2/2");
    });

    // 2.7 - handleResponse "n" on last page shows message
    it('handleResponse "n" on last page shows message', async () => {
      // Move to last page first
      state.page = 2;

      const result = await marketplaceHandler.handleResponse(
        testUserId,
        testContactId,
        "n",
        state,
        { sendMessage: async () => {} },
        "test@c.us"
      );

      expect(result.completed).toBe(false);
      expect(result.message).toContain("last page");
    });

    // 2.8 - handleResponse "p" navigates to previous page
    it('handleResponse "p" navigates to previous page', async () => {
      state.page = 2;

      const result = await marketplaceHandler.handleResponse(
        testUserId,
        testContactId,
        "p",
        state,
        { sendMessage: async () => {} },
        "test@c.us"
      );

      expect(result.completed).toBe(false);
      expect(result.newState?.page).toBe(1);
      expect(result.message).toContain("Page 1/2");
    });

    // 2.9 - handleResponse "p" on first page shows message
    it('handleResponse "p" on first page shows message', async () => {
      const result = await marketplaceHandler.handleResponse(
        testUserId,
        testContactId,
        "p",
        state,
        { sendMessage: async () => {} },
        "test@c.us"
      );

      expect(result.completed).toBe(false);
      expect(result.message).toContain("first page");
    });
  });

  describe("handleResponse - Command Installation", () => {
    let state: MarketplaceState;

    beforeEach(async () => {
      // Register a command
      await commandRegistry.registerCommand(
        testDeveloperId,
        "install-cmd",
        "Installable Command",
        "Can be installed",
        ".install-cmd",
        "https://github.com/test/repo",
        "index.ts",
        true
      );

      state = await marketplaceHandler.buildInitialState(testUserId, testContactId);
    });

    // 2.10 - handleResponse number selects and installs command
    it("handleResponse number selects and installs command", async () => {
      const result = await marketplaceHandler.handleResponse(
        testUserId,
        testContactId,
        "1",
        state,
        { sendMessage: async () => {} },
        "test@c.us"
      );

      expect(result.completed).toBe(true);
      expect(result.message).toContain("installed");

      // Verify installation
      const installs = userService.getUserInstallations(testUserId, testContactId);
      expect(installs.some(i => i.userSlug === "install-cmd")).toBe(true);
    });

    // 2.11 - handleResponse already installed shows message
    it("handleResponse already installed shows message", async () => {
      // Install the command first
      const cmd = commandRegistry.getCommandByFullId("testdev/install-cmd");
      if (cmd) {
        userService.installCommand(testUserId, testContactId, cmd.id, "install-cmd");
      }

      // Try to install again
      const result = await marketplaceHandler.handleResponse(
        testUserId,
        testContactId,
        "1",
        state,
        { sendMessage: async () => {} },
        "test@c.us"
      );

      expect(result.completed).toBe(true);
      expect(result.message).toContain("already installed");
    });

    // 2.12 - handleResponse invalid number shows error
    it("handleResponse invalid number shows error", async () => {
      const result = await marketplaceHandler.handleResponse(
        testUserId,
        testContactId,
        "99",
        state,
        { sendMessage: async () => {} },
        "test@c.us"
      );

      expect(result.completed).toBe(false);
      expect(result.message).toContain("Invalid selection");
    });
  });

  describe("handleResponse - Slug Collision", () => {
    let state: MarketplaceState;

    beforeEach(async () => {
      // Register two commands with same slug from different developers
      sqlite.exec("INSERT INTO developers (id, username) VALUES (2, 'dev2')");
      
      await commandRegistry.registerCommand(
        testDeveloperId,
        "collision-cmd",
        "First Command",
        "First description",
        ".collision-cmd",
        "https://github.com/test/repo1",
        "index.ts",
        true
      );

      await commandRegistry.registerCommand(
        2,
        "collision-cmd",
        "Second Command",
        "Second description",
        ".collision-cmd",
        "https://github.com/test/repo2",
        "index.ts",
        true
      );

      // Install first command for user
      const cmd1 = commandRegistry.getCommandByFullId("testdev/collision-cmd");
      if (cmd1) {
        userService.installCommand(testUserId, testContactId, cmd1.id, "collision-cmd");
      }

      state = await marketplaceHandler.buildInitialState(testUserId, testContactId);
    });

    // 2.13 - handleResponse collision shows replacement options
    it("handleResponse collision shows replacement options", async () => {
      // Find the index of the second command (dev2/collision-cmd)
      const cmdIndex = state.commands.findIndex(c => c.slug === "collision-cmd" && c.fullId.includes("dev2"));
      const selection = (cmdIndex + 1).toString();

      const result = await marketplaceHandler.handleResponse(
        testUserId,
        testContactId,
        selection,
        state,
        { sendMessage: async () => {} },
        "test@c.us"
      );

      expect(result.completed).toBe(false);
      expect(result.message).toContain("already have");
      expect(result.message).toContain("replace");
      expect(result.message).toContain("new");
      expect(result.newState?.awaitingCollision).toBeDefined();
    });

    // 2.14 - handleResponse "replace" option works
    it('handleResponse "replace" option works', async () => {
      // First trigger collision
      const cmdIndex = state.commands.findIndex(c => c.slug === "collision-cmd" && c.fullId.includes("dev2"));
      const selection = (cmdIndex + 1).toString();

      const collisionResult = await marketplaceHandler.handleResponse(
        testUserId,
        testContactId,
        selection,
        state,
        { sendMessage: async () => {} },
        "test@c.us"
      );

      // Then respond with "replace"
      const replaceResult = await marketplaceHandler.handleResponse(
        testUserId,
        testContactId,
        "replace",
        collisionResult.newState!,
        { sendMessage: async () => {} },
        "test@c.us"
      );

      expect(replaceResult.completed).toBe(true);
      expect(replaceResult.message).toContain("installed");

      // Verify the new command is installed
      const installs = userService.getUserInstallations(testUserId, testContactId);
      const collisionInstall = installs.find(i => i.userSlug === "collision-cmd");
      expect(collisionInstall).toBeDefined();
    });

    // 2.15 - handleResponse "new" option works
    it('handleResponse "new" option works', async () => {
      // First trigger collision
      const cmdIndex = state.commands.findIndex(c => c.slug === "collision-cmd" && c.fullId.includes("dev2"));
      const selection = (cmdIndex + 1).toString();

      const collisionResult = await marketplaceHandler.handleResponse(
        testUserId,
        testContactId,
        selection,
        state,
        { sendMessage: async () => {} },
        "test@c.us"
      );

      // Then respond with "new"
      const newResult = await marketplaceHandler.handleResponse(
        testUserId,
        testContactId,
        "new",
        collisionResult.newState!,
        { sendMessage: async () => {} },
        "test@c.us"
      );

      expect(newResult.completed).toBe(true);
      expect(newResult.message).toContain("installed");
      expect(newResult.message).toContain("collision-cmd1");
    });

    // 2.16 - handleResponse invalid collision response shows error
    it("handleResponse invalid collision response shows error", async () => {
      // First trigger collision
      const cmdIndex = state.commands.findIndex(c => c.slug === "collision-cmd" && c.fullId.includes("dev2"));
      const selection = (cmdIndex + 1).toString();

      const collisionResult = await marketplaceHandler.handleResponse(
        testUserId,
        testContactId,
        selection,
        state,
        { sendMessage: async () => {} },
        "test@c.us"
      );

      // Then respond with invalid input
      const invalidResult = await marketplaceHandler.handleResponse(
        testUserId,
        testContactId,
        "invalid",
        collisionResult.newState!,
        { sendMessage: async () => {} },
        "test@c.us"
      );

      expect(invalidResult.completed).toBe(false);
      expect(invalidResult.message).toContain("replace");
    });
  });

  describe("buildInitialState", () => {
    // 2.17 - buildInitialState creates correct state
    it("buildInitialState creates correct state", async () => {
      // Register commands
      for (let i = 1; i <= 3; i++) {
        await commandRegistry.registerCommand(
          testDeveloperId,
          `init-cmd${i}`,
          `Initial Command ${i}`,
          `Description ${i}`,
          `.init-cmd${i}`,
          "https://github.com/test/repo",
          "index.ts",
          true
        );
      }

      const state = await marketplaceHandler.buildInitialState(testUserId, testContactId);

      expect(state.page).toBe(1);
      expect(state.totalPages).toBe(1);
      expect(state.commands.length).toBe(3);
      expect(state.commands[0].slug).toBe("init-cmd1");
    });

    it("buildInitialState marks commands as installed or not", async () => {
      // Register and install a command
      const cmd = await commandRegistry.registerCommand(
        testDeveloperId,
        "state-cmd",
        "State Command",
        "Test state",
        ".state-cmd",
        "https://github.com/test/repo",
        "index.ts",
        true
      );

      userService.installCommand(testUserId, testContactId, cmd.id, "state-cmd");

      // Register another command but don't install
      await commandRegistry.registerCommand(
        testDeveloperId,
        "not-installed",
        "Not Installed",
        "Not installed yet",
        ".not-installed",
        "https://github.com/test/repo",
        "index.ts",
        true
      );

      const state = await marketplaceHandler.buildInitialState(testUserId, testContactId);

      const stateCmd = state.commands.find(c => c.slug === "state-cmd");
      const notInstalledCmd = state.commands.find(c => c.slug === "not-installed");

      expect(stateCmd?.installed).toBe(true);
      expect(notInstalledCmd?.installed).toBe(false);
    });
  });
});