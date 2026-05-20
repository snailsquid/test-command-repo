import { Hono } from "hono";
import { commandRegistry } from "./registry";

export const commandRoutes = new Hono();

/**
 * POST /api/commands/register
 * Register a new command from a GitHub repo
 */
commandRoutes.post("/commands/register", async (c) => {
  try {
    const body = await c.req.json<{
      developerId: number;
      slug: string;
      name: string;
      description: string;
      usage: string;
      repoUrl: string;
      entryPoint?: string;
    }>();

    // Validate required fields
    const required = ["developerId", "slug", "name", "description", "usage", "repoUrl"] as const;
    const missing = required.filter((field) => !body[field]);
    if (missing.length > 0) {
      return c.json({ error: `Missing required fields: ${missing.join(", ")}` }, 400);
    }

    const command = await commandRegistry.registerCommand(
      body.developerId,
      body.slug.trim(),
      body.name,
      body.description,
      body.usage,
      body.repoUrl,
      body.entryPoint || "index.ts"
    );

    return c.json({ success: true, command }, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Routes] Register command failed:", message);
    return c.json({ error: message }, 400);
  }
});

/**
 * GET /api/commands
 * List all active commands (for marketplace)
 */
commandRoutes.get("/commands", (c) => {
  try {
    const commands = commandRegistry.getAllActiveCommands();
    return c.json({ commands });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/commands/search?q=query
 * Search commands by name or slug
 */
commandRoutes.get("/commands/search", (c) => {
  try {
    const query = c.req.query("q") || "";
    if (!query.trim()) {
      return c.json({ commands: [] });
    }
    const commands = commandRegistry.searchCommands(query);
    return c.json({ commands });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: message }, 500);
  }
});

/**
 * GET /api/commands/:id
 * Get a specific command by full ID (username/slug)
 */
commandRoutes.get("/commands/:id", (c) => {
  try {
    const fullId = c.req.param("id");
    const command = commandRegistry.getCommandByFullId(fullId);
    if (!command) {
      return c.json({ error: "Command not found" }, 404);
    }
    return c.json({ command });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json({ error: message }, 500);
  }
});
