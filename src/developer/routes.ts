import { Hono } from "hono";
import { db, schema } from "../db";
import { eq, and } from "drizzle-orm";
import { commandRegistry } from "../commands/registry";

interface DeveloperContext {
  developerId: number;
  developerUsername: string;
}

export const developerRoutes = new Hono<{ Variables: DeveloperContext }>();

// ---- Session-based auth middleware ----
function bearerAuth(c: any, next: any) {
  const auth = c.req.header("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return c.json({ error: "Unauthorized" }, 401);
  const token = auth.slice(7);
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  // Look up session token in sessions table
  const session = db.select().from(schema.sessions).where(eq(schema.sessions.token, token)).get();
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const dev = db.select().from(schema.developers).where(eq(schema.developers.id, session.developerId)).get();
  if (!dev) return c.json({ error: "Unauthorized" }, 401);

  c.set("developerId", dev.id);
  c.set("developerUsername", dev.username);
  return next();
}

// ---- Helper: get developer from context ----
function getDeveloperFromContext(c: any) {
  const id = c.get("developerId") as number;
  return db.select().from(schema.developers).where(eq(schema.developers.id, id)).get();
}

// ---- Auth: Initiate WhatsApp login ----
developerRoutes.post("/auth/init", async (c) => {
  const { username } = await c.req.json<{ username?: string }>();
  if (!username) return c.json({ error: "Username required" }, 400);

  // Check if username is taken by a developer with a linked WhatsApp number
  const existingDev = db.select().from(schema.developers).where(eq(schema.developers.username, username)).get();
  if (existingDev && existingDev.whatsappJid) {
    return c.json({ error: "Username is already taken" }, 409);
  }

  // Create developer if not exists
  let dev = existingDev;
  if (!dev) {
    dev = db.insert(schema.developers).values({ username }).returning().get();
  }

  // Generate a registration token with 10-minute expiry
  const token = `tk_${crypto.randomUUID().replace(/-/g, "")}`;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  db.insert(schema.registrationTokens).values({
    token,
    developerId: dev.id,
    used: false,
    expiresAt,
  }).run();

  const waUrl = `https://wa.me/682128383086?text=.login%20${token}`;
  const phone = "+62 821-2838-3086";

  return c.json({ token, waUrl, phone });
});

// ---- Auth: Poll for login status ----
developerRoutes.get("/auth/status", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.json({ error: "Token required" }, 400);

  const regToken = db.select().from(schema.registrationTokens).where(eq(schema.registrationTokens.token, token)).get();
  if (!regToken) return c.json({ status: "expired" });

  // Check if token has expired
  if (regToken.expiresAt && new Date(regToken.expiresAt) < new Date()) {
    return c.json({ status: "expired" });
  }

  // Check if token has been used (login confirmed via WhatsApp)
  if (regToken.used) {
    // Find the session created during login
    if (!regToken.developerId) return c.json({ status: "expired" });
    const dev = db.select().from(schema.developers).where(eq(schema.developers.id, regToken.developerId)).get();
    if (!dev) return c.json({ status: "expired" });

    // Find the session for this developer (most recent)
    const sessions = db.select().from(schema.sessions)
      .where(eq(schema.sessions.developerId, dev.id))
      .all();
    const session = sessions[sessions.length - 1];

    return c.json({
      status: "complete",
      sessionToken: session?.token,
      developerId: dev.id,
      username: dev.username,
    });
  }

  return c.json({ status: "pending" });
});

// ---- Legacy login endpoint (deprecated) ----
developerRoutes.post("/login", async (c) => {
  return c.json({ error: "This endpoint has been deprecated. Use POST /developer/auth/init instead." }, 410);
});

// ---- Repository-based command management ----

// 5.1 Register a repository
developerRoutes.post("/repos", bearerAuth, async (c) => {
  const dev = getDeveloperFromContext(c);
  if (!dev) return c.json({ error: "Developer not found" }, 404);

  const { repoUrl, skipValidation } = await c.req.json<{
    repoUrl?: string; skipValidation?: boolean;
  }>();

  if (!repoUrl) {
    return c.json({ error: "Missing required field: repoUrl" }, 400);
  }

  try {
    const commands = await commandRegistry.registerRepository(dev.id, repoUrl.trim(), skipValidation);
    return c.json({ success: true, commands }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// 5.2 List repositories with their commands
developerRoutes.get("/repos", bearerAuth, (c) => {
  const dev = getDeveloperFromContext(c);
  if (!dev) return c.json({ error: "Developer not found" }, 404);

  const repos = commandRegistry.getRepositories(dev.id);
  return c.json({ repos });
});

// 5.3 Refresh a repository
developerRoutes.post("/repos/:repoUrl/refresh", bearerAuth, async (c) => {
  const dev = getDeveloperFromContext(c);
  if (!dev) return c.json({ error: "Developer not found" }, 404);

  const repoUrl = decodeURIComponent(c.req.param("repoUrl"));
  const { skipValidation } = await c.req.json<{ skipValidation?: boolean }>();

  try {
    const result = await commandRegistry.refreshRepository(dev.id, repoUrl, skipValidation);
    return c.json({ success: true, ...result });
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

// 5.4 Delete a repository
developerRoutes.delete("/repos/:repoUrl", bearerAuth, (c) => {
  const dev = getDeveloperFromContext(c);
  if (!dev) return c.json({ error: "Developer not found" }, 404);

  const repoUrl = decodeURIComponent(c.req.param("repoUrl"));
  const count = commandRegistry.deleteRepository(dev.id, repoUrl);
  return c.json({ success: true, deletedCount: count });
});

// ---- Legacy command endpoints (deprecated - return 410) ----

developerRoutes.post("/commands", (c) => c.json({ error: "Endpoint removed. Use POST /developer/repos instead." }, 410));
developerRoutes.get("/commands", (c) => c.json({ error: "Endpoint removed. Use GET /developer/repos instead." }, 410));
developerRoutes.put("/commands/:id", (c) => c.json({ error: "Endpoint removed. Use POST /developer/repos/:repoUrl/refresh instead." }, 410));
developerRoutes.post("/commands/:id/disable", (c) => c.json({ error: "Endpoint removed. Use DELETE /developer/repos/:repoUrl instead." }, 410));
developerRoutes.post("/commands/:id/enable", (c) => c.json({ error: "Endpoint removed. Use DELETE /developer/repos/:repoUrl instead." }, 410));

// ---- 12.6 Command analytics ----
developerRoutes.get("/commands/:id/analytics", bearerAuth, (c) => {
  const id = parseInt(c.req.param("id"));
  const cmd = db.select().from(schema.commands).where(eq(schema.commands.id, id)).get();
  if (!cmd) return c.json({ error: "Command not found" }, 404);

  const installs = db.select().from(schema.installations).where(eq(schema.installations.commandId, id)).all();
  const uniqueContacts = new Set(installs.map((i) => i.contactId)).size;

  return c.json({
    installCount: installs.length,
    uniqueContacts,
    usageCount: installs.length,
    errorCount: 0,
  });
});