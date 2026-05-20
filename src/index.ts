import app from "./server";
import { initSessionManager } from "./gateway/session-manager";

const port = Number(process.env.PORT) || 3000;
const wahaBaseUrl = process.env.WAHA_BASE_URL || "http://localhost:3001";

// Initialize session manager
const sessionManager = initSessionManager(wahaBaseUrl);
sessionManager.initialize().then(() => {
  sessionManager.start();
  console.log(`[SessionManager] Started monitoring WAHA sessions`);
}).catch((err) => {
  console.error("[SessionManager] Init error:", err);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  sessionManager.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  sessionManager.stop();
  process.exit(0);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Unhandled Rejection] Reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[Uncaught Exception] Error:", error);
});

console.log(`🚀 Akka WhatsApp Platform starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
