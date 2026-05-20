import type { WahaClient as IWahaClient } from "../types";

/**
 * WahaClient - Client for interacting with WAHA (WhatsApp HTTP API)
 * Implements the WahaClient interface for sending messages and reactions
 */
export class WahaClient implements IWahaClient {
  private readonly baseUrl: string;
  private readonly sessionId: string;
  private readonly apiKey: string | undefined;

  constructor(baseUrl: string, sessionId: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.sessionId = sessionId;
    this.apiKey = process.env.WAHA_API_KEY;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }
    return headers;
  }

  /**
   * Send a text message to a WhatsApp chat
   */
  async sendMessage(chatId: string, text: string): Promise<{ messageId: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sendText`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          chatId,
          text,
          session: this.sessionId,
        }),
      });

      if (!response.ok) {
        console.error(`[WahaClient] sendMessage failed: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const result = await response.json() as { id?: string; messageId?: string };
      return { messageId: result.id || result.messageId || "" };
    } catch (error) {
      console.error(`[WahaClient] sendMessage error:`, error);
      throw error;
    }
  }

  /**
   * Send a reaction (emoji) to a message
   * API: PUT /api/reaction
   */
  async sendReaction(messageId: string, chatId: string, emoji: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/reaction`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify({
          session: this.sessionId,
          messageId,
          reaction: emoji,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WahaClient] sendReaction failed: ${response.status} ${response.statusText} - ${errorText}`);
        // Don't throw for reactions - they are non-critical
      }
    } catch (error) {
      console.error(`[WahaClient] sendReaction error:`, error);
      // Don't throw for reactions
    }
  }

  /**
   * Remove a reaction from a message
   * API: PUT /api/reaction with empty reaction string
   */
  async removeReaction(messageId: string, chatId: string, emoji: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/reaction`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify({
          session: this.sessionId,
          messageId,
          reaction: "", // Empty string removes the reaction
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WahaClient] removeReaction failed: ${response.status} ${response.statusText} - ${errorText}`);
        // Don't throw for reactions - they are non-critical
      }
    } catch (error) {
      console.error(`[WahaClient] removeReaction error:`, error);
      // Don't throw for reactions
    }
  }

  /**
   * Get the session ID for this client
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Check session health by fetching session status
   * Returns true if session exists and is in WORKING status
   */
  async checkHealth(): Promise<boolean> {
    try {
      const apiKey = process.env.WAHA_API_KEY;
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers["X-API-Key"] = apiKey;
      }

      // Add timeout to prevent hanging (WAHA can be slow)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${this.baseUrl}/api/sessions/${this.sessionId}`, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.status === 401 || response.status === 403) {
        // Auth required - can't verify, return true to avoid false negatives
        console.warn(`[WahaClient] Session ${this.sessionId} health check requires auth`);
        return true;
      }

      if (!response.ok) {
        return false;
      }

      const data = await response.json() as { status?: string };
      return data.status === "WORKING";
    } catch (error) {
      console.error(`[WahaClient] Health check error for ${this.sessionId}:`, error);
      return false;
    }
  }
}

/**
 * Factory function to create WahaClient instances
 */
export function createWahaClient(baseUrl: string, sessionId: string): WahaClient {
  return new WahaClient(baseUrl, sessionId);
}
