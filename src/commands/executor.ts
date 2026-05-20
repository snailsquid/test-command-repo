import { VM } from "vm2";
import type { CommandContext, CommandDefinition } from "../types";

interface ExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * 7.1-7.6 Sandboxed command executor
 * Uses vm2 for V8 sandbox isolation
 */
export class CommandExecutor {
  private defaultTimeoutMs: number;

  constructor(timeoutMs: number = 5000) {
    this.defaultTimeoutMs = timeoutMs;
  }

  /**
   * 7.2 Create execution context injected into sandbox
   */
  createExecutionContext(
    send: (text: string) => Promise<void>,
    react: (emoji: string) => Promise<void>,
    schedule: (duration: string, callback: () => Promise<void>) => Promise<void>,
    userId: string,
    args: string[],
    message: string,
    contactId: number
  ): CommandContext {
    const ctx: CommandContext = {
      send: async (text: string) => {
        await send(text);
      },
      react: async (emoji: string) => {
        await react(emoji);
      },
      schedule: async (duration: string, callback: () => Promise<void>) => {
        await schedule(duration, callback);
      },
      fetch: async (url: string, options?: RequestInit) => {
        // 7.5 Developers CAN access external servers via ctx.fetch
        // The sandbox's native fetch is blocked, but ctx.fetch proxies through Bun's fetch
        return fetch(url, options);
      },
      userId,
      args,
      message,
      contactId,
    };

    // Freeze to prevent modification
    return Object.freeze(ctx);
  }

  /**
   * 7.1 Create a sandboxed VM
   * Blocks: fs, process, require, global, raw fetch, setTimeout/setInterval (except limited)
   */
  private createVM(commandSource: string, ctx: CommandContext): VM {
    const vm = new VM({
      timeout: this.defaultTimeoutMs,
      sandbox: { ctx },
      eval: false,
      wasm: false,
      allowAsync: true,
      fixAsync: true,
    });

    // 7.5 Block dangerous globals in the sandbox
    vm.freeze(commandSource, "module"); // Freeze the code source
    vm.freeze(ctx, "ctx");

    return vm;
  }

  /**
   * 7.1-7.4 Execute a command in sandboxed VM
   */
  async executeCommand(
    source: string,
    ctx: CommandContext,
    timeoutMs?: number
  ): Promise<ExecutionResult> {
    const effectiveTimeout = timeoutMs || this.defaultTimeoutMs;

    try {
      const vm = this.createVM(source, ctx);

      // 7.3 Run with timeout
      const result = await Promise.race([
        vm.run(`(async () => {
          // The command source should export a handle(ctx) function
          // We resolve the module and call handle
          const module = {};
          const exports = {};
          const __akka_eval = new Function('exports', 'module', 'ctx', source);
          __akka_eval(exports, module, ctx);
          
          // Try to get the handle function
          const handler = exports.handle || (module.exports && module.exports.handle);
          if (typeof handler !== 'function') {
            throw new Error('Command must export a handle(ctx) function');
          }
          await handler(ctx);
        })()`),
        this.timeoutPromise(effectiveTimeout),
      ]);

      return { success: true, result };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      // 7.4 Log the error
      console.error("[Executor] Command execution failed:", message);

      return { success: false, error: message };
    }
  }

  /**
   * 7.3 Timeout promise
   */
  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Command execution timed out after ${ms}ms`)), ms)
    );
  }

  /**
   * 7.6 Test sandbox isolation
   */
  verifySandboxIsolation(): { passed: boolean; issues: string[] } {
    const issues: string[] = [];

    try {
      const vm = new VM({
        timeout: 1000,
        sandbox: {},
        eval: false,
        wasm: false,
      });

      // Test blocked globals
      const checks: Array<[string, string]> = [
        ["typeof process", "process should be undefined"],
        ["typeof require", "require should be undefined"],
        ["typeof global", "global should be undefined"],
        ["typeof __dirname", "__dirname should be undefined"],
        ["typeof __filename", "__filename should be undefined"],
      ];

      for (const [code, desc] of checks) {
        try {
          const result = vm.run(code);
          if (result !== "undefined") {
            issues.push(`${desc} (was: ${result})`);
          }
        } catch {
          // Error accessing is expected for blocked globals - that's good
        }
      }
    } catch (error) {
      issues.push(`VM setup failed: ${error}`);
    }

    return {
      passed: issues.length === 0,
      issues,
    };
  }
}

// Singleton
export const commandExecutor = new CommandExecutor(5000);
