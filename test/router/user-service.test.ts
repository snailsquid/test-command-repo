import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTestDb, resetTestDb, closeTestDb } from "../utils/test-db";
import { createTestUser } from "../utils/mocks";
import { UserService } from "../../src/router/user-service";
import { Database } from "bun:sqlite";

describe("UserService", () => {
  let sqlite: Database;
  let db: any;
  let userService: UserService;

  beforeEach(() => {
    const testDb = createTestDb();
    sqlite = testDb.sqlite;
    db = testDb.db;
    userService = new UserService();
  });

  afterEach(() => {
    closeTestDb(sqlite);
  });

  describe("getOrCreateUser", () => {
    it("should create new user when not exists", () => {
      const user = userService.getOrCreateUser("newuser@c.us");
      
      expect(user).toBeDefined();
      expect(user.phoneJid).toBe("newuser@c.us");
      expect(user.anonymizedId).toBeDefined();
    });

    it("should return existing user when exists", () => {
      const user1 = userService.getOrCreateUser("existing@c.us");
      const user2 = userService.getOrCreateUser("existing@c.us");

      expect(user1.id).toBe(user2.id);
      expect(user1.anonymizedId).toBe(user2.anonymizedId);
    });

    it("should generate unique anonymized IDs", () => {
      const user1 = userService.getOrCreateUser("user1@c.us");
      const user2 = userService.getOrCreateUser("user2@c.us");

      expect(user1.anonymizedId).not.toBe(user2.anonymizedId);
    });
  });

  describe("findByJid", () => {
    it("should return null for non-existent user", () => {
      const result = userService.findByJid("nonexistent@c.us");
      expect(result).toBeNull();
    });

    it("should find existing user", () => {
      const created = userService.getOrCreateUser("findme@c.us");
      const found = userService.findByJid("findme@c.us");

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });
  });

  describe("findById", () => {
    it("should return null for non-existent ID", () => {
      const result = userService.findById(999999);
      expect(result).toBeNull();
    });

    it("should find user by ID", () => {
      const created = userService.getOrCreateUser("byid@c.us");
      const found = userService.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.phoneJid).toBe("byid@c.us");
    });
  });

  describe("installation management", () => {
    beforeEach(() => {
      sqlite.exec("INSERT INTO developers (id, username) VALUES (?, ?)", [1, "dev1"]);
      sqlite.exec("INSERT INTO contacts (id, name, phone_number, waha_session_id) VALUES (?, ?, ?, ?)", [1, "Test", "+1234567890", "session-1"]);
      sqlite.exec("INSERT INTO users (id, phone_jid, anonymized_id) VALUES (?, ?, ?)", [1, "user1@c.us", "anon1"]);
      sqlite.exec("INSERT INTO commands (id, developer_id, slug, name, description, usage, repo_url, entry_point, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", 
        [1, 1, "test-cmd", "Test", "Desc", ".test", "https://github.com/test/repo", "index.ts", "active"]);
    });

    describe("installCommand", () => {
      it("should install command for user", () => {
        const installation = userService.installCommand(1, 1, 1, "my-cmd");

        expect(installation).toBeDefined();
        expect(installation.userId).toBe(1);
        expect(installation.contactId).toBe(1);
        expect(installation.commandId).toBe(1);
        expect(installation.userSlug).toBe("my-cmd");
      });

      it("should return existing installation if already installed", () => {
        const inst1 = userService.installCommand(1, 1, 1, "my-cmd");
        const inst2 = userService.installCommand(1, 1, 1, "my-cmd");

        expect(inst1.id).toBe(inst2.id);
      });
    });

    describe("isInstalled", () => {
      it("should return false for non-installed command", () => {
        const result = userService.isInstalled(1, 1, "not-installed");
        expect(result).toBe(false);
      });

      it("should return true for installed command", () => {
        userService.installCommand(1, 1, 1, "my-cmd");
        const result = userService.isInstalled(1, 1, "my-cmd");
        expect(result).toBe(true);
      });
    });

    describe("getUserInstallations", () => {
      it("should return empty array for user with no installations", () => {
        const installations = userService.getUserInstallations(1, 1);
        expect(installations).toHaveLength(0);
      });

      it("should return user's installations", () => {
        userService.installCommand(1, 1, 1, "cmd1");
        userService.installCommand(1, 1, 1, "cmd2");

        const installations = userService.getUserInstallations(1, 1);
        expect(installations).toHaveLength(2);
      });
    });

    describe("uninstallCommand", () => {
      it("should uninstall command", () => {
        userService.installCommand(1, 1, 1, "to-remove");
        expect(userService.isInstalled(1, 1, "to-remove")).toBe(true);

        const result = userService.uninstallCommand(1, 1, "to-remove");
        expect(result).toBe(true);
        expect(userService.isInstalled(1, 1, "to-remove")).toBe(false);
      });

      it("should return false for non-existent installation", () => {
        const result = userService.uninstallCommand(1, 1, "never-installed");
        expect(result).toBe(false);
      });
    });

    describe("renameInstallation", () => {
      it("should rename installation", () => {
        userService.installCommand(1, 1, 1, "old-name");
        
        const result = userService.renameInstallation(1, 1, "old-name", "new-name");
        expect(result).toBe(true);

        expect(userService.isInstalled(1, 1, "old-name")).toBe(false);
        expect(userService.isInstalled(1, 1, "new-name")).toBe(true);
      });

      it("should return false for non-existent installation", () => {
        const result = userService.renameInstallation(1, 1, "never", "ever");
        expect(result).toBe(false);
      });
    });

    describe("getUserSlugs", () => {
      it("should return empty array when no installations", () => {
        const slugs = userService.getUserSlugs(1, 1);
        expect(slugs).toHaveLength(0);
      });

      it("should return all user slugs", () => {
        userService.installCommand(1, 1, 1, "slug1");
        userService.installCommand(1, 1, 1, "slug2");
        userService.installCommand(1, 1, 1, "slug3");

        const slugs = userService.getUserSlugs(1, 1);
        expect(slugs).toHaveLength(3);
        expect(slugs).toContain("slug1");
        expect(slugs).toContain("slug2");
        expect(slugs).toContain("slug3");
      });
    });
  });
});
