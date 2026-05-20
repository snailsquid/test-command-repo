import { describe, it, expect } from "bun:test";
import { parseDuration } from "../../src/scheduler/parser";

describe("Duration Parser", () => {
  describe("parseDuration", () => {
    it("should parse seconds", () => {
      expect(parseDuration("30s")).toBe(30000);
      expect(parseDuration("1s")).toBe(1000);
      expect(parseDuration("60s")).toBe(60000);
    });

    it("should parse minutes", () => {
      expect(parseDuration("10m")).toBe(600000);
      expect(parseDuration("1m")).toBe(60000);
      expect(parseDuration("60m")).toBe(3600000);
    });

    it("should parse hours", () => {
      expect(parseDuration("2h")).toBe(7200000);
      expect(parseDuration("1h")).toBe(3600000);
      expect(parseDuration("24h")).toBe(86400000);
    });

    it("should parse days", () => {
      expect(parseDuration("1d")).toBe(86400000);
      expect(parseDuration("2d")).toBe(172800000);
    });

    it("should handle decimal values", () => {
      expect(parseDuration("1.5h")).toBe(5400000);
      expect(parseDuration("0.5m")).toBe(30000);
    });

    it("should handle whitespace", () => {
      expect(parseDuration(" 10m ")).toBe(600000);
      expect(parseDuration("10 m")).toBe(600000);
    });

    it("should throw on empty input", () => {
      expect(() => parseDuration("")).toThrow("Duration string is empty");
      expect(() => parseDuration("   ")).toThrow("Duration string is empty");
    });

    it("should throw on invalid format", () => {
      expect(() => parseDuration("10")).toThrow("Invalid duration format");
      expect(() => parseDuration("minutes")).toThrow("Invalid duration format");
      expect(() => parseDuration("10x")).toThrow("Invalid duration format");
    });

    it("should throw on unknown unit", () => {
      expect(() => parseDuration("10w")).toThrow("Invalid duration format");
      expect(() => parseDuration("10y")).toThrow("Invalid duration format");
    });
  });
});
