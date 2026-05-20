import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTestDb, closeTestDb } from "../utils/test-db";
import { MockWahaClient } from "../utils/mocks";
import { Database } from "bun:sqlite";

describe("WahaClient", () => {
  let mockClient: MockWahaClient;

  beforeEach(() => {
    mockClient = new MockWahaClient();
  });

  afterEach(() => {
    mockClient.reset();
  });

  describe("sendMessage", () => {
    it("should store sent messages", async () => {
      await mockClient.sendMessage("123@c.us", "Hello World");
      
      expect(mockClient.sentMessages).toHaveLength(1);
      expect(mockClient.sentMessages[0]).toEqual({
        chatId: "123@c.us",
        text: "Hello World",
      });
    });

    it("should return message ID", async () => {
      const result = await mockClient.sendMessage("123@c.us", "Test");
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toStartWith("msg-");
    });

    it("should handle multiple messages", async () => {
      await mockClient.sendMessage("123@c.us", "Message 1");
      await mockClient.sendMessage("456@c.us", "Message 2");
      await mockClient.sendMessage("123@c.us", "Message 3");

      expect(mockClient.sentMessages).toHaveLength(3);
    });
  });

  describe("sendReaction", () => {
    it("should store reactions", async () => {
      await mockClient.sendReaction("msg-123", "123@c.us", "👍");
      
      expect(mockClient.reactions).toHaveLength(1);
      expect(mockClient.reactions[0]).toEqual({
        messageId: "msg-123",
        chatId: "123@c.us",
        emoji: "👍",
      });
    });

    it("should handle multiple reactions", async () => {
      await mockClient.sendReaction("msg-1", "123@c.us", "👍");
      await mockClient.sendReaction("msg-1", "123@c.us", "❤️");
      await mockClient.sendReaction("msg-2", "456@c.us", "👍");

      expect(mockClient.reactions).toHaveLength(3);
    });
  });

  describe("removeReaction", () => {
    it("should remove stored reactions", async () => {
      await mockClient.sendReaction("msg-123", "123@c.us", "👍");
      expect(mockClient.reactions).toHaveLength(1);

      await mockClient.removeReaction("msg-123", "123@c.us", "👍");
      expect(mockClient.reactions).toHaveLength(0);
    });

    it("should only remove matching reactions", async () => {
      await mockClient.sendReaction("msg-1", "123@c.us", "👍");
      await mockClient.sendReaction("msg-1", "123@c.us", "❤️");
      await mockClient.sendReaction("msg-2", "123@c.us", "👍");

      await mockClient.removeReaction("msg-1", "123@c.us", "👍");

      expect(mockClient.reactions).toHaveLength(2);
      expect(mockClient.reactions.some(r => r.emoji === "❤️")).toBe(true);
    });
  });

  describe("checkHealth", () => {
    it("should return health status", async () => {
      mockClient.healthStatus = true;
      const result = await mockClient.checkHealth();
      expect(result).toBe(true);

      mockClient.healthStatus = false;
      const result2 = await mockClient.checkHealth();
      expect(result2).toBe(false);
    });
  });

  describe("reset", () => {
    it("should clear all data", async () => {
      await mockClient.sendMessage("123@c.us", "Test");
      await mockClient.sendReaction("msg-1", "123@c.us", "👍");
      mockClient.healthStatus = false;

      mockClient.reset();

      expect(mockClient.sentMessages).toHaveLength(0);
      expect(mockClient.reactions).toHaveLength(0);
      expect(mockClient.healthStatus).toBe(true);
    });
  });
});
