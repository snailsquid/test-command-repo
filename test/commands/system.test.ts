import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTestDb, closeTestDb } from "../utils/test-db";
import { MockWahaClient } from "../utils/mocks";
import { Database } from "bun:sqlite";
import { handleSystemCommand } from "../../src/commands/system";

describe("System Commands", () => {
  let sqlite: Database;
  let mockClient: MockWahaClient;

  beforeEach(() => {
    const testDb = createTestDb();
    sqlite = testDb.sqlite;
    mockClient = new MockWahaClient();

    // Setup test data
    sqlite.exec("INSERT INTO developers (id, username) VALUES (?, ?)", [1, "dev1"]);
    sqlite.exec("INSERT INTO contacts (id, name, phone_number, waha_session_id) VALUES (?, ?, ?, ?)", [1, "Test", "+1234567890", "session-1"]);
    sqlite.exec("INSERT INTO users (id, phone_jid, anonymized_id) VALUES (?, ?, ?)", [1, "user1@c.us", "anon1"]);
    sqlite.exec("INSERT INTO commands (id, developer_id, slug, name, description, usage, repo_url, entry_point, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", 
      [1, 1, "test-cmd", "Test Command", "A test command", ".test [args]", "https://github.com/test/repo", "index.ts", "active"]);
  });

  afterEach(() => {
    closeTestDb(sqlite);
    mockClient.reset();
  });

  describe("help command", () => {
    it("should show empty message when no commands installed", async () => {
      await handleSystemCommand("help", {
        userId: 1,
        contactId: 1,
        userJid: "user1@c.us",
        wahaClient: mockClient,
        args: [],
        messageId: "msg-1",
      });

      expect(mockClient.sentMessages).toHaveLength(1);
      expect(mockClient.sentMessages[0].text).toContain("no commands installed");
    });

    it("should show installed commands", async () => {
      // Install a command first
      sqlite.exec(
        "INSERT INTO installations (user_id, contact_id, command_id, user_slug) VALUES (?, ?, ?, ?)",
        [1, 1, 1, "my-cmd"]
      );

      await handleSystemCommand("help", {
        userId: 1,
        contactId: 1,
        userJid: "user1@c.us",
        wahaClient: mockClient,
        args: [],
        messageId: "msg-1",
      });

      expect(mockClient.sentMessages[0].text).toContain("my-cmd");
      expect(mockClient.sentMessages[0].text).toContain("Test Command");
    });
  });

  describe("uninstall command", () => {
    it("should show usage on missing slug", async () => {
      await handleSystemCommand("uninstall", {
        userId: 1,
        contactId: 1,
        userJid: "user1@c.us",
        wahaClient: mockClient,
        args: [],
        messageId: "msg-1",
      });

      expect(mockClient.sentMessages[0].text).toContain("Usage:");
    });

    it("should report when command not installed", async () => {
      await handleSystemCommand("uninstall", {
        userId: 1,
        contactId: 1,
        userJid: "user1@c.us",
        wahaClient: mockClient,
        args: ["not-installed"],
        messageId: "msg-1",
      });

      expect(mockClient.sentMessages[0].text).toContain("not installed");
    });

    it("should uninstall command successfully", async () => {
      sqlite.exec(
        "INSERT INTO installations (user_id, contact_id, command_id, user_slug) VALUES (?, ?, ?, ?)",
        [1, 1, 1, "to-remove"]
      );

      await handleSystemCommand("uninstall", {
        userId: 1,
        contactId: 1,
        userJid: "user1@c.us",
        wahaClient: mockClient,
        args: ["to-remove"],
        messageId: "msg-1",
      });

      expect(mockClient.sentMessages[0].text).toContain("has been uninstalled");
      
      // Verify removal
      const result = sqlite.query("SELECT * FROM installations WHERE user_slug = ?").get("to-remove");
      expect(result).toBeUndefined();
    });
  });

  describe("rename command", () => {
    it("should show usage on missing args", async () => {
      await handleSystemCommand("rename", {
        userId: 1,
        contactId: 1,
        userJid: "user1@c.us",
        wahaClient: mockClient,
        args: ["old-name"],
        messageId: "msg-1",
      });

      expect(mockClient.sentMessages[0].text).toContain("Usage:");
    });

    it("should report when old command not installed", async () => {
      await handleSystemCommand("rename", {
        userId: 1,
        contactId: 1,
        userJid: "user1@c.us",
        wahaClient: mockClient,
        args: ["old", "new"],
        messageId: "msg-1",
      });

      expect(mockClient.sentMessages[0].text).toContain("not installed");
    });

    it("should report conflict when new name already exists", async () => {
      sqlite.exec(
        "INSERT INTO installations (user_id, contact_id, command_id, user_slug) VALUES (?, ?, ?, ?)",
        [1, 1, 1, "existing"]
      );

      await handleSystemCommand("rename", {
        userId: 1,
        contactId: 1,
        userJid: "user1@c.us",
        wahaClient: mockClient,
        args: ["existing", "existing"],
        messageId: "msg-1",
      });

      expect(mockClient.sentMessages[0].text).toContain("already have");
    });

    it("should rename successfully", async () => {
      sqlite.exec(
        "INSERT INTO installations (user_id, contact_id, command_id, user_slug) VALUES (?, ?, ?, ?)",
        [1, 1, 1, "old-name"]
      );

      await handleSystemCommand("rename", {
        userId: 1,
        contactId: 1,
        userJid: "user1@c.us",
        wahaClient: mockClient,
        args: ["old-name", "new-name"],
        messageId: "msg-1",
      });

      expect(mockClient.sentMessages[0].text).toContain("Renamed");
      expect(mockClient.sentMessages[0].text).toContain("new-name");
    });
  });

  describe("marketplace command", () => {
    it("should show marketplace with flow starter", async () => {
      const mockFlowStarter = async () => "🛒 *Marketplace*\n\nPage 1/1\n\nNo commands available.";

      await handleSystemCommand("marketplace", {
        userId: 1,
        contactId: 1,
        userJid: "user1@c.us",
        wahaClient: mockClient,
        args: [],
        messageId: "msg-1",
      }, mockFlowStarter);

      expect(mockClient.sentMessages[0].text).toContain("Marketplace");
    });

    it("should show coming soon without flow starter", async () => {
      await handleSystemCommand("marketplace", {
        userId: 1,
        contactId: 1,
        userJid: "user1@c.us",
        wahaClient: mockClient,
        args: [],
        messageId: "msg-1",
      });

      expect(mockClient.sentMessages[0].text).toContain("Coming soon");
    });
  });
});
