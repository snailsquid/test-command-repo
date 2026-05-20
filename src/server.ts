import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import path from "path";
import { readFileSync, existsSync } from "fs";
import { webhookRouter } from "./gateway/webhook";
import { adminRoutes } from "./admin/routes";
import { developerRoutes } from "./developer/routes";
import { commandRoutes } from "./commands/routes";

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

// Health check
app.get("/", (c) => c.json({ status: "ok", platform: "akka" }));

// API routes
app.route("/webhook", webhookRouter);
app.route("/api", commandRoutes);
app.route("/admin", adminRoutes);
app.route("/developer", developerRoutes);

// Serve static file helper — only serves actual file requests (with extensions)
// and falls back to index.html for root paths. API routes are matched first.
function serveFrontend(basePath: string, urlPrefix: string) {
  return async (c: any, next: () => Promise<void>) => {
    const reqPath = c.req.path;

    // Strip the URL prefix to get the relative file path
    const relPath = reqPath.replace(new RegExp(`^${urlPrefix}/?`), "") || "index.html";

    // Only serve requests that look like static file paths (have an extension)
    // or are the root path (which maps to index.html)
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(relPath);
    const isRoot = relPath === "index.html";

    if (!hasExtension && !isRoot) {
      await next();
      return;
    }

    const filePath = path.join(basePath, relPath);

    // Skip if path is a directory (not a file)
    if (existsSync(filePath) && require("fs").statSync(filePath).isDirectory()) {
      await next();
      return;
    }

    if (existsSync(filePath) && !existsSync(path.join(filePath, "index.html"))) {
      const content = readFileSync(filePath);
      const ext = path.extname(filePath);
      const mimeTypes: Record<string, string> = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
      };
      const mime = mimeTypes[ext] || "application/octet-stream";
      return c.body(content, 200, { "Content-Type": mime, "Content-Length": String(content.length) });
    }

    // Fall back to index.html (SPA routing) for root path only
    if (isRoot) {
      const indexPath = path.join(basePath, "index.html");
      if (existsSync(indexPath)) {
        const content = readFileSync(indexPath);
        return c.html(content);
      }
    }

    await next();
  };
}

// Serve admin dashboard (static files only — API routes handled above)
app.use("/admin/*", serveFrontend(path.join(process.cwd(), "src/admin/static"), "/admin"));

// Serve developer dashboard (static files only — API routes handled above)
app.use("/developer/*", serveFrontend(path.join(process.cwd(), "src/developer/static"), "/developer"));

// Redirect /admin -> /admin/ and /developer -> /developer/
app.get("/admin", (c) => c.redirect("/admin/"));
app.get("/developer", (c) => c.redirect("/developer/"));

export default app;
