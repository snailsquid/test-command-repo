import { Hono } from "hono";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { initSessionManager, getSessionManager } from "../gateway/session-manager";

export const adminRoutes = new Hono();

// Simple admin auth middleware
function adminAuth(c: any, next: any) {
  const auth = c.req.header("Authorization") || "";
  if (auth !== "Bearer admin-token") return c.json({ error: "Unauthorized" }, 401);
  return next();
}

// 13.1 Admin login
adminRoutes.post("/login", async (c) => {
  const { username, password } = await c.req.json<{ username?: string; password?: string }>();
  if (username === "admin" && password === "admin") {
    return c.json({ token: "admin-token" });
  }
  return c.json({ error: "Invalid credentials" }, 401);
});

// 13.2 Contact management
adminRoutes.get("/contacts", adminAuth, (c) => {
  const contacts = db.select().from(schema.contacts).all();
  return c.json({ contacts });
});

adminRoutes.post("/contacts", adminAuth, async (c) => {
  try {
    const body = await c.req.json() as unknown as {
      name: string; phoneNumber: string; wahaSessionId: string;
    };
    const { name, phoneNumber, wahaSessionId } = body;

    if (!name || !phoneNumber || !wahaSessionId) {
      return c.json({ error: "name, phoneNumber, and wahaSessionId required" }, 400);
    }

    const existing = db.select().from(schema.contacts).where(eq(schema.contacts.wahaSessionId, wahaSessionId)).get();
    if (existing) return c.json({ error: "Session already configured" }, 409);

    const contact = db.insert(schema.contacts).values({ name, phoneNumber, wahaSessionId }).returning().get();

    try {
      const sm = getSessionManager();
      sm.addSession(contact.id, wahaSessionId);
    } catch {
      // Session manager may not be initialized yet - that's OK
    }

    return c.json({ contact }, 201);
  } catch (err) {
    console.error("[Admin] POST /contacts error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
});

adminRoutes.delete("/contacts/:id", adminAuth, (c) => {
  const id = parseInt(c.req.param("id"));
  const contact = db.select().from(schema.contacts).where(eq(schema.contacts.id, id)).get();
  if (!contact) return c.json({ error: "Contact not found" }, 404);

  db.delete(schema.contacts).where(eq(schema.contacts.id, id)).run();

  try {
    const sm = getSessionManager();
    sm.removeSession(contact.wahaSessionId);
  } catch { /* ok */ }

  return c.json({ success: true });
});

// 13.3 Session status dashboard
adminRoutes.get("/sessions", adminAuth, (c) => {
  try {
    const sm = getSessionManager();
    const sessions = sm.getAllSessions().map((s) => ({
      contactId: s.contactId,
      sessionId: s.sessionId,
      isHealthy: s.isHealthy,
    }));
    return c.json({ sessions });
  } catch {
    return c.json({ sessions: [], message: "Session manager not initialized" });
  }
});
