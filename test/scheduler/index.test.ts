import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTestDb, closeTestDb } from "../utils/test-db";
import { Database } from "bun:sqlite";
import { Scheduler } from "../../src/scheduler";

describe("Scheduler", () => {
  let sqlite: Database;
  let db: any;
  let scheduler: Scheduler;
  let executedTasks: any[] = [];

  beforeEach(() => {
    const testDb = createTestDb();
    sqlite = testDb.sqlite;
    db = testDb.db;
    executedTasks = [];
    
    scheduler = new Scheduler(async (task) => {
      executedTasks.push(task);
    }, 100); // 100ms poll interval for fast tests

    // Setup test data
    sqlite.exec("INSERT INTO contacts (id, name, phone_number, waha_session_id) VALUES (?, ?, ?, ?)", [1, "Test", "+1234567890", "session-1"]);
    sqlite.exec("INSERT INTO users (id, phone_jid, anonymized_id) VALUES (?, ?, ?)", [1, "user1@c.us", "anon1"]);
  });

  afterEach(() => {
    scheduler.stop();
    closeTestDb(sqlite);
  });

  describe("addTask", () => {
    it("should add a scheduled task", () => {
      const executeAt = new Date(Date.now() + 60000);
      const task = scheduler.addTask(1, 1, "test-cmd", "payload", 60000);

      expect(task).toBeDefined();
      expect(task.userId).toBe(1);
      expect(task.contactId).toBe(1);
      expect(task.commandSlug).toBe("test-cmd");
      expect(task.payload).toBe("payload");
      expect(task.status).toBe("pending");
    });

    it("should calculate executeAt correctly", () => {
      const before = Date.now();
      const task = scheduler.addTask(1, 1, "test-cmd", "payload", 60000);
      const after = Date.now();

      const executeAtTime = new Date(task.executeAt).getTime();
      expect(executeAtTime).toBeGreaterThanOrEqual(before + 60000);
      expect(executeAtTime).toBeLessThanOrEqual(after + 60000 + 1000);
    });
  });

  describe("scheduleFromDuration", () => {
    it("should parse duration and schedule task", () => {
      const task = scheduler.scheduleFromDuration(1, 1, "remind", "test", "10m");
      
      expect(task.commandSlug).toBe("remind");
      expect(task.payload).toBe("test");
      
      const delay = new Date(task.executeAt).getTime() - Date.now();
      expect(delay).toBeGreaterThanOrEqual(600000 - 1000);
      expect(delay).toBeLessThanOrEqual(600000 + 1000);
    });
  });

  describe("tick", () => {
    it("should execute due tasks", async () => {
      // Add task that is already due
      const pastTime = new Date(Date.now() - 1000).toISOString();
      sqlite.exec(
        "INSERT INTO scheduled_tasks (user_id, contact_id, command_slug, payload, execute_at, status) VALUES (?, ?, ?, ?, ?, ?)",
        [1, 1, "test-cmd", "test-payload", pastTime, "pending"]
      );

      const executed = await scheduler.tick();

      expect(executed).toBe(1);
      expect(executedTasks).toHaveLength(1);
      expect(executedTasks[0].commandSlug).toBe("test-cmd");
    });

    it("should not execute future tasks", async () => {
      const futureTime = new Date(Date.now() + 60000).toISOString();
      sqlite.exec(
        "INSERT INTO scheduled_tasks (user_id, contact_id, command_slug, payload, execute_at, status) VALUES (?, ?, ?, ?, ?, ?)",
        [1, 1, "test-cmd", "test-payload", futureTime, "pending"]
      );

      const executed = await scheduler.tick();

      expect(executed).toBe(0);
      expect(executedTasks).toHaveLength(0);
    });

    it("should only execute pending tasks", async () => {
      const pastTime = new Date(Date.now() - 1000).toISOString();
      sqlite.exec(
        "INSERT INTO scheduled_tasks (user_id, contact_id, command_slug, payload, execute_at, status) VALUES (?, ?, ?, ?, ?, ?)",
        [1, 1, "executed-cmd", "payload", pastTime, "executed"]
      );
      sqlite.exec(
        "INSERT INTO scheduled_tasks (user_id, contact_id, command_slug, payload, execute_at, status) VALUES (?, ?, ?, ?, ?, ?)",
        [1, 1, "pending-cmd", "payload", pastTime, "pending"]
      );

      const executed = await scheduler.tick();

      expect(executed).toBe(1);
      expect(executedTasks[0].commandSlug).toBe("pending-cmd");
    });

    it("should mark tasks as executed", async () => {
      const pastTime = new Date(Date.now() - 1000).toISOString();
      sqlite.exec(
        "INSERT INTO scheduled_tasks (id, user_id, contact_id, command_slug, payload, execute_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [1, 1, 1, "test-cmd", "payload", pastTime, "pending"]
      );

      await scheduler.tick();

      const result = sqlite.query("SELECT status FROM scheduled_tasks WHERE id = ?").get(1);
      expect(result.status).toBe("executed");
    });
  });

  describe("start/stop", () => {
    it("should start and stop scheduler", () => {
      expect(scheduler.isRunning()).toBe(false);
      
      scheduler.start();
      expect(scheduler.isRunning()).toBe(true);
      
      scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });

    it("should not start twice", () => {
      scheduler.start();
      scheduler.start(); // Should not throw
      expect(scheduler.isRunning()).toBe(true);
    });
  });
});
