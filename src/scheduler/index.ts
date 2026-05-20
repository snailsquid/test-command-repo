import { db, schema } from "../db";
import { eq, and, lte } from "drizzle-orm";
import type { ScheduledTask } from "../types";
import { parseDuration } from "./parser";

type TaskCallback = (task: ScheduledTask) => Promise<void>;

/**
 * 11.1-11.6 Scheduler for delayed command execution
 * SQLite-backed, polls every 30s, survives restarts
 */
export class Scheduler {
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private onExecute: TaskCallback;
  private pollMs: number;
  private running: boolean = false;

  constructor(onExecute: TaskCallback, pollMs: number = 30000) {
    this.onExecute = onExecute;
    this.pollMs = pollMs;
  }

  /**
   * 11.1 Add a scheduled task
   */
  addTask(
    userId: number,
    contactId: number,
    commandSlug: string,
    payload: string,
    delayMs: number
  ): ScheduledTask {
    const executeAt = new Date(Date.now() + delayMs).toISOString();

    const result = db
      .insert(schema.scheduledTasks)
      .values({
        userId,
        contactId,
        commandSlug,
        payload,
        executeAt,
        status: "pending",
      })
      .returning()
      .get();

    console.log(`[Scheduler] Added task: ${commandSlug} for user ${userId}, execute at ${executeAt}`);
    return result;
  }

  /**
   * 11.1 Schedule from a duration string
   */
  scheduleFromDuration(
    userId: number,
    contactId: number,
    commandSlug: string,
    payload: string,
    duration: string
  ): ScheduledTask {
    const delayMs = parseDuration(duration);
    return this.addTask(userId, contactId, commandSlug, payload, delayMs);
  }

  /**
   * 11.3-11.4 Get and execute due tasks
   */
  async tick(): Promise<number> {
    const now = new Date().toISOString();
    const tasks = db
      .select()
      .from(schema.scheduledTasks)
      .where(
        and(eq(schema.scheduledTasks.status, "pending"), lte(schema.scheduledTasks.executeAt, now))
      )
      .all();

    if (tasks.length > 0) {
      console.log(`[Scheduler] Found ${tasks.length} due task(s)`);
    }

    let executed = 0;
    // 11.4 Execute one at a time to avoid SQLite concurrency issues
    for (const task of tasks) {
      try {
        await this.onExecute(task);
        this.markExecuted(task.id);
        executed++;
      } catch (error) {
        this.markFailed(task.id);
        console.error(`[Scheduler] Task ${task.id} failed:`, error);
      }
    }

    return executed;
  }

  /**
   * 11.1 Mark task as executed
   */
  markExecuted(id: number): void {
    db.update(schema.scheduledTasks)
      .set({ status: "executed" } as any)
      .where(eq(schema.scheduledTasks.id, id))
      .run();
  }

  /**
   * 11.6 Mark task as failed
   */
  markFailed(id: number): void {
    db.update(schema.scheduledTasks)
      .set({ status: "failed" } as any)
      .where(eq(schema.scheduledTasks.id, id))
      .run();
  }

  /**
   * 11.1 Get pending tasks (for restart recovery)
   */
  getPendingTasks(): ScheduledTask[] {
    return db
      .select()
      .from(schema.scheduledTasks)
      .where(eq(schema.scheduledTasks.status, "pending"))
      .all();
  }

  /**
   * 11.3 Start the scheduler poll loop
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    console.log(`[Scheduler] Starting poll loop (every ${this.pollMs}ms)`);

    // 11.5 Restart recovery: execute any past-due pending tasks immediately
    this.tick().catch((err) => {
      console.error("[Scheduler] Error during startup recovery:", err);
    });

    this.pollInterval = setInterval(() => {
      this.tick().catch((err) => {
        console.error("[Scheduler] Error during poll tick:", err);
      });
    }, this.pollMs);
  }

  /**
   * 11.3 Stop the scheduler
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.running = false;
    console.log("[Scheduler] Stopped");
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.running;
  }
}
