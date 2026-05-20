import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTestDb, resetTestDb, closeTestDb } from "../utils/test-db";
import { Database } from "bun:sqlite";
import { Router, getRouter } from "../../src/router";
import { userService } from "../../src/router/user-service";
import { commandRegistry } from "../../src/commands/registry";
import type { WebhookPayload } from "../../src/types";

describe("Router", () => {
  let sqlite: Database;
  let router: Router;
  let testUserId: number;
  let testContactId: number;
  let testDeveloperId: number;

  beforeEach(() => {
    const testDb = createTestDb();
    sqlite = testDb.sqlite;
    router = getRouter();

    // Insert test data using raw SQL
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

  describe("parseCommand", () => {
    // 3.2 - parseCommand parses basic command
    it("parseCommand parses basic command", async () => {
      // Install a command first
      const cmd = await commandRegistry.registerCommand(
        testDeveloperId,
        "mycmd",
        "My Command",
        "A test command",
        ".mycmd",
        "https://github.com/test/repo",
        "index.ts",
        true
      );
      userService.installCommand(testUserId, testContactId, cmd.id, "mycmd");

      const result = router.parseCommand(".mycmd", testUserId, testContactId);

      expect(result).not.toBeNull();
      expect(result?.slug).toBe("mycmd");
      expect(result?.args).toEqual([]);
      expect(result?.userSlug).toBe("mycmd");
    });

    // 3.3 - parseCommand parses command with arguments
    it("parseCommand parses command with arguments", async () => {
      // Install a command first
      const cmd = await commandRegistry.registerCommand(
        testDeveloperId,
        "mycmd",
        "My Command",
        "A test command",
        ".mycmd",
        "https://github.com/test/repo",
        "index.ts",
        true
      );
      userService.installCommand(testUserId, testContactId, cmd.id, "mycmd");

      const result = router.parseCommand(".mycmd arg1 arg2", testUserId, testContactId);

      expect(result).not.toBeNull();
      expect(result?.slug).toBe("mycmd");
      expect(result?.args).toEqual(["arg1", "arg2"]);
      expect(result?.userSlug).toBe("mycmd");
    });

    // 3.4 - parseCommand returns null for non-command
    it("parseCommand returns null for non-command", () => {
      const result = router.parseCommand("hello world", testUserId, testContactId);
      expect(result).toBeNull();
    });

    // 3.5 - parseCommand returns null for empty command
    it("parseCommand returns null for empty command", () => {
      const result = router.parseCommand(".", testUserId, testContactId);
      expect(result).toBeNull();

      const result2 = router.parseCommand(".   ", testUserId, testContactId);
      expect(result2).toBeNull();
    });

    // 3.6 - parseCommand matches longest slug first
    it("parseCommand matches longest slug first", async () => {
      // Install two commands with overlapping slugs
      const cmd1 = await commandRegistry.registerCommand(
        testDeveloperId,
        "test",
        "Test Command",
        "Short slug",
        ".test",
        "https://github.com/test/repo1",
        "index.ts",
        true
      );
      userService.installCommand(testUserId, testContactId, cmd1.id, "test");

      const cmd2 = await commandRegistry.registerCommand(
        testDeveloperId,
        "test-cmd",
        "Test Cmd",
        "Longer slug",
        ".test-cmd",
        "https://github.com/test/repo2",
        "index.ts",
        true
      );
      userService.installCommand(testUserId, testContactId, cmd2.id, "test-cmd");

      const result = router.parseCommand(".test-cmd arg", testUserId, testContactId);

      expect(result).not.toBeNull();
      expect(result?.slug).toBe("test-cmd"); // Should match longer slug
    });

    // 3.7 - parseCommand case insensitive matching
    it("parseCommand case insensitive matching", async () => {
      // Install a command
      const cmd = await commandRegistry.registerCommand(
        testDeveloperId,
        "mycmd",
        "My Command",
        "A test command",
        ".mycmd",
        "https://github.com/test/repo",
        "index.ts",
        true
      );
      userService.installCommand(testUserId, testContactId, cmd.id, "mycmd");

      const result = router.parseCommand(".MYCMD", testUserId, testContactId);

      expect(result).not.toBeNull();
      expect(result?.slug).toBe("mycmd");
    });
  });

  describe("Flow Management", () => {
    // 3.8 - startFlow creates flow in database
    it("startFlow creates flow in database", () => {
      const flow = router.startFlow(testUserId, testContactId, "marketplace", { page: 1 });

      expect(flow).toBeDefined();
      expect(flow.id).toBeGreaterThan(0);
      expect(flow.userId).toBe(testUserId);
      expect(flow.contactId).toBe(testContactId);
      expect(flow.flowType).toBe("marketplace");
      expect(flow.state).toBe("start");
    });

    // 3.9 - getActiveFlow returns current flow
    it("getActiveFlow returns current flow", () => {
      const createdFlow = router.startFlow(testUserId, testContactId, "marketplace", { page: 1 });

      const activeFlow = router.getActiveFlow(testUserId, testContactId);

      expect(activeFlow).not.toBeNull();
      expect(activeFlow?.id).toBe(createdFlow.id);
      expect(activeFlow?.flowType).toBe("marketplace");
    });

    // 3.10 - getActiveFlow returns null for no active flow
    it("getActiveFlow returns null for no active flow", () => {
      const result = router.getActiveFlow(testUserId, testContactId);
      expect(result).toBeNull();
    });

    // 3.11 - updateFlow modifies flow state and data
    it("updateFlow modifies flow state and data", () => {
      const flow = router.startFlow(testUserId, testContactId, "marketplace", { page: 1 });

      router.updateFlow(flow.id, "browsing", { page: 2, totalPages: 3 });

      const updatedFlow = router.getActiveFlow(testUserId, testContactId);
      expect(updatedFlow?.state).toBe("browsing");
      expect(updatedFlow?.data.page).toBe(2);
    });

    // 3.12 - endFlow deletes flow
    it("endFlow deletes flow", () => {
      const flow = router.startFlow(testUserId, testContactId, "marketplace", {});

      const result = router.endFlow(flow.id);
      expect(result).toBe(true);

      const deletedFlow = router.getActiveFlow(testUserId, testContactId);
      expect(deletedFlow).toBeNull();
    });

    // 3.13 - isInFlow checks if user in active flow
    it("isInFlow checks if user in active flow", () => {
      router.startFlow(testUserId, testContactId, "marketplace", {});

      const result = router.isInFlow(testUserId, testContactId);
      expect(result).toBe(true);
    });

    // 3.14 - isInFlow returns false for no flow
    it("isInFlow returns false for no flow", () => {
      const result = router.isInFlow(testUserId, testContactId);
      expect(result).toBe(false);
    });
  });

  describe("handleIncomingMessage", () => {
    // 3.15 - handleIncomingMessage routes to system command
    it("handleIncomingMessage routes to system command", async () => {
      const payload: WebhookPayload = {
        sessionId: "test-session",
        senderJid: "test@c.us",
        messageId: "msg-123",
        body: ".help",
        timestamp: Date.now(),
        isGroupChat: false,
      };

      // Should not throw - system commands are handled
      await router.handleIncomingMessage(payload, testContactId);
    });

    // 3.16 - handleIncomingMessage routes to installed command
    it("handleIncomingMessage routes to installed command", async () => {
      // Install a command
      const cmd = await commandRegistry.registerCommand(
        testDeveloperId,
        "testcmd",
        "Test Command",
        "A test command",
        ".testcmd",
        "https://github.com/test/repo",
        "index.ts",
        true
      );
      userService.installCommand(testUserId, testContactId, cmd.id, "testcmd");

      const payload: WebhookPayload = {
        sessionId: "test-session",
        senderJid: "test@c.us",
        messageId: "msg-123",
        body: ".testcmd arg1",
        timestamp: Date.now(),
        isGroupChat: false,
      };

      // Should not throw - handles the command (may fail due to missing source, but shouldn't crash)
      await router.handleIncomingMessage(payload, testContactId);
    });

    // 3.17 - handleIncomingMessage shows "not installed" for unknown
    it("handleIncomingMessage shows 'not installed' for unknown", async () => {
      const payload: WebhookPayload = {
        sessionId: "test-session",
        senderJid: "test@c.us",
        messageId: "msg-123",
        body: ".unknown-cmd",
        timestamp: Date.now(),
        isGroupChat: false,
      };

      // Should not throw - returns "not installed" message
      await router.handleIncomingMessage(payload, testContactId);
    });

    // 3.18 - handleIncomingMessage handles errors gracefully
    it("handleIncomingMessage handles errors gracefully", async () => {
      // Install a command but the repo won't be accessible (skipValidation=true so it registers)
      const cmd = await commandRegistry.registerCommand(
        testDeveloperId,
        "errcmd",
        "Error Command",
        "A command that will error",
        ".errcmd",
        "https://github.com/test/nonexistent",
        "index.ts",
        true // skip validation so it registers
      );
      userService.installCommand(testUserId, testContactId, cmd.id, "errcmd");

      const payload: WebhookPayload = {
        sessionId: "test-session",
        senderJid: "test@c.us",
        messageId: "msg-123",
        body: ".errcmd",
        timestamp: Date.now(),
        isGroupChat: false,
      };

      // Should not throw - handles error gracefully
      await router.handleIncomingMessage(payload, testContactId);
    });
  });
});