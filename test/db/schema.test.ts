import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTestDb, resetTestDb, closeTestDb } from "../utils/test-db";
import { createTestContact, createTestUser, createTestDeveloper, createTestCommand } from "../utils/mocks";
import { Database } from "bun:sqlite";

describe("Database Schema", () => {
  let sqlite: Database;
  let db: any;

  beforeEach(() => {
    const testDb = createTestDb();
    sqlite = testDb.sqlite;
    db = testDb.db;
  });

  afterEach(() => {
    closeTestDb(sqlite);
  });

  describe("contacts table", () => {
    it("should insert and retrieve a contact", () => {
      const contact = createTestContact({ name: "Test", phoneNumber: "+1234567890", wahaSessionId: "session-1" });
      
      sqlite.exec(
        "INSERT INTO contacts (name, phone_number, waha_session_id) VALUES (?, ?, ?)",
        [contact.name, contact.phoneNumber, contact.wahaSessionId]
      );

      const result = sqlite.query("SELECT * FROM contacts WHERE waha_session_id = ?").get("session-1");
      expect(result).toBeDefined();
      expect(result.name).toBe("Test");
      expect(result.phone_number).toBe("+1234567890");
    });

    it("should enforce unique waha_session_id", () => {
      const contact = createTestContact({ wahaSessionId: "session-unique" });
      
      sqlite.exec(
        "INSERT INTO contacts (name, phone_number, waha_session_id) VALUES (?, ?, ?)",
        [contact.name, contact.phoneNumber, contact.wahaSessionId]
      );

      expect(() => {
        sqlite.exec(
          "INSERT INTO contacts (name, phone_number, waha_session_id) VALUES (?, ?, ?)",
          [contact.name, contact.phoneNumber, contact.wahaSessionId]
        );
      }).toThrow();
    });
  });

  describe("users table", () => {
    it("should insert and retrieve a user", () => {
      const user = createTestUser({ phoneJid: "user1@c.us", anonymizedId: "anon1" });
      
      sqlite.exec(
        "INSERT INTO users (phone_jid, anonymized_id) VALUES (?, ?)",
        [user.phoneJid, user.anonymizedId]
      );

      const result = sqlite.query("SELECT * FROM users WHERE phone_jid = ?").get("user1@c.us");
      expect(result).toBeDefined();
      expect(result.anonymized_id).toBe("anon1");
    });

    it("should enforce unique phone_jid", () => {
      const user = createTestUser({ phoneJid: "user-unique@c.us" });
      
      sqlite.exec(
        "INSERT INTO users (phone_jid, anonymized_id) VALUES (?, ?)",
        [user.phoneJid, user.anonymizedId]
      );

      expect(() => {
        sqlite.exec(
          "INSERT INTO users (phone_jid, anonymized_id) VALUES (?, ?)",
          [user.phoneJid, "different-anon"]
        );
      }).toThrow();
    });
  });

  describe("developers table", () => {
    it("should insert and retrieve a developer", () => {
      sqlite.exec(
        "INSERT INTO developers (username) VALUES (?)",
        ["testdev"]
      );

      const result = sqlite.query("SELECT * FROM developers WHERE username = ?").get("testdev");
      expect(result).toBeDefined();
      expect(result.username).toBe("testdev");
    });

    it("should enforce unique username", () => {
      sqlite.exec("INSERT INTO developers (username) VALUES (?)", ["unique-user"]);

      expect(() => {
        sqlite.exec("INSERT INTO developers (username) VALUES (?)", ["unique-user"]);
      }).toThrow();
    });
  });

  describe("commands table", () => {
    it("should insert command with foreign key", () => {
      sqlite.exec("INSERT INTO developers (id, username) VALUES (?, ?)", [1, "dev1"]);
      
      const command = createTestCommand({ developerId: 1, slug: "test-cmd" });
      sqlite.exec(
        "INSERT INTO commands (developer_id, slug, name, description, usage, repo_url, entry_point, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [command.developerId, command.slug, command.name, command.description, command.usage, command.repoUrl, command.entryPoint, command.status]
      );

      const result = sqlite.query("SELECT * FROM commands WHERE slug = ?").get("test-cmd");
      expect(result).toBeDefined();
      expect(result.name).toBe(command.name);
    });

    it("should enforce foreign key constraint", () => {
      const command = createTestCommand({ developerId: 999, slug: "bad-cmd" });
      
      expect(() => {
        sqlite.exec(
          "INSERT INTO commands (developer_id, slug, name, description, usage, repo_url, entry_point, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [command.developerId, command.slug, command.name, command.description, command.usage, command.repoUrl, command.entryPoint, command.status]
        );
      }).toThrow();
    });
  });

  describe("installations table", () => {
    beforeEach(() => {
      sqlite.exec("INSERT INTO developers (id, username) VALUES (?, ?)", [1, "dev1"]);
      sqlite.exec("INSERT INTO contacts (id, name, phone_number, waha_session_id) VALUES (?, ?, ?, ?)", [1, "Test", "+1234567890", "session-1"]);
      sqlite.exec("INSERT INTO users (id, phone_jid, anonymized_id) VALUES (?, ?, ?)", [1, "user1@c.us", "anon1"]);
      sqlite.exec("INSERT INTO commands (id, developer_id, slug, name, description, usage, repo_url, entry_point, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", 
        [1, 1, "test-cmd", "Test", "Desc", ".test", "https://github.com/test/repo", "index.ts", "active"]);
    });

    it("should create installation with all foreign keys", () => {
      sqlite.exec(
        "INSERT INTO installations (user_id, contact_id, command_id, user_slug) VALUES (?, ?, ?, ?)",
        [1, 1, 1, "my-cmd"]
      );

      const result = sqlite.query("SELECT * FROM installations WHERE user_slug = ?").get("my-cmd");
      expect(result).toBeDefined();
      expect(result.user_id).toBe(1);
      expect(result.contact_id).toBe(1);
      expect(result.command_id).toBe(1);
    });
  });

  describe("scheduled_tasks table", () => {
    beforeEach(() => {
      sqlite.exec("INSERT INTO contacts (id, name, phone_number, waha_session_id) VALUES (?, ?, ?, ?)", [1, "Test", "+1234567890", "session-1"]);
      sqlite.exec("INSERT INTO users (id, phone_jid, anonymized_id) VALUES (?, ?, ?)", [1, "user1@c.us", "anon1"]);
    });

    it("should create scheduled task", () => {
      sqlite.exec(
        "INSERT INTO scheduled_tasks (user_id, contact_id, command_slug, payload, execute_at, status) VALUES (?, ?, ?, ?, ?, ?)",
        [1, 1, "remind", "test message", new Date().toISOString(), "pending"]
      );

      const result = sqlite.query("SELECT * FROM scheduled_tasks WHERE command_slug = ?").get("remind");
      expect(result).toBeDefined();
      expect(result.status).toBe("pending");
    });
  });

  describe("conversation_flows table", () => {
    beforeEach(() => {
      sqlite.exec("INSERT INTO contacts (id, name, phone_number, waha_session_id) VALUES (?, ?, ?, ?)", [1, "Test", "+1234567890", "session-1"]);
      sqlite.exec("INSERT INTO users (id, phone_jid, anonymized_id) VALUES (?, ?, ?)", [1, "user1@c.us", "anon1"]);
    });

    it("should create conversation flow", () => {
      const expiresAt = new Date(Date.now() + 60000).toISOString();
      sqlite.exec(
        "INSERT INTO conversation_flows (user_id, contact_id, flow_type, state, data, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
        [1, 1, "marketplace", "start", "{}", expiresAt]
      );

      const result = sqlite.query("SELECT * FROM conversation_flows WHERE flow_type = ?").get("marketplace");
      expect(result).toBeDefined();
      expect(result.state).toBe("start");
    });
  });

  describe("registration_tokens table", () => {
    beforeEach(() => {
      sqlite.exec("INSERT INTO developers (id, username) VALUES (?, ?)", [1, "dev1"]);
    });

    it("should create registration token", () => {
      sqlite.exec(
        "INSERT INTO registration_tokens (token, developer_id, used) VALUES (?, ?, ?)",
        ["abc123", 1, 0]
      );

      const result = sqlite.query("SELECT * FROM registration_tokens WHERE token = ?").get("abc123");
      expect(result).toBeDefined();
      expect(result.used).toBe(0);
    });

    it("should enforce unique token", () => {
      sqlite.exec("INSERT INTO registration_tokens (token, developer_id) VALUES (?, ?)", ["unique-token", 1]);

      expect(() => {
        sqlite.exec("INSERT INTO registration_tokens (token, developer_id) VALUES (?, ?)", ["unique-token", 1]);
      }).toThrow();
    });
  });
});
