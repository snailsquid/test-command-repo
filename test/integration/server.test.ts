import { describe, it, expect } from "bun:test";
import app from "../../src/server";

describe("Server Routes", () => {
  describe("GET /", () => {
    it("should return health check", async () => {
      const res = await app.request("/");
      expect(res.status).toBe(200);
      
      const body = await res.json();
      expect(body.status).toBe("ok");
      expect(body.platform).toBe("akka");
    });
  });

  describe("GET /webhook", () => {
    it("should return webhook endpoint status", async () => {
      const res = await app.request("/webhook");
      expect(res.status).toBe(200);
      
      const body = await res.json();
      expect(body.status).toContain("webhook endpoint");
    });
  });

  describe("POST /webhook", () => {
    it("should return 400 on invalid payload", async () => {
      const res = await app.request("/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      
      expect(res.status).toBe(400);
    });

    it("should return 200 on valid message event", async () => {
      const res = await app.request("/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "message",
          session: "default",
          payload: {
            from: "123@c.us",
            id: "msg-123",
            body: "hello",
            timestamp: Date.now(),
          },
        }),
      });
      
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("ok");
    });
  });
});
