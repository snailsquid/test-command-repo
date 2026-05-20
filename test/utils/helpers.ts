import { expect } from "bun:test";

/**
 * Assert that a date string is valid ISO format
 */
export function expectValidIsoDate(dateStr: string) {
  const date = new Date(dateStr);
  expect(date.getTime()).not.toBeNaN();
}

/**
 * Assert that an object has required properties
 */
export function expectHasProps(obj: any, props: string[]) {
  for (const prop of props) {
    expect(obj).toHaveProperty(prop);
  }
}

/**
 * Create a delay promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an assertion multiple times
 */
export async function retry<T>(
  fn: () => T | Promise<T>,
  options: { retries?: number; delay?: number } = {}
): Promise<T> {
  const { retries = 3, delay: delayMs = 100 } = options;
  
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        await delay(delayMs);
      }
    }
  }
  throw lastError;
}

/**
 * Generate unique test IDs
 */
let testIdCounter = 0;
export function generateTestId(): string {
  return `test-${Date.now()}-${++testIdCounter}`;
}

/**
 * Assert that a promise rejects with specific error
 */
export async function expectRejectsWith(
  promise: Promise<any>,
  expectedMessage: string | RegExp
) {
  try {
    await promise;
    throw new Error("Expected promise to reject but it resolved");
  } catch (error: any) {
    if (typeof expectedMessage === "string") {
      expect(error.message).toContain(expectedMessage);
    } else {
      expect(error.message).toMatch(expectedMessage);
    }
  }
}
