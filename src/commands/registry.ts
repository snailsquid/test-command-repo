import { db, schema } from "../db";
import { eq, and, like } from "drizzle-orm";
import type { CommandRecord, AkkaManifest, AkkaCommand } from "../types";

interface CachedCommand {
  source: string;
  fetchedAt: number;
}

interface CachedManifest {
  manifest: AkkaManifest;
  fetchedAt: number;
}

// 1-hour TTL for manifest cache
const MANIFEST_CACHE_TTL = 3600000;

export class CommandRegistry {
  private cache: Map<string, CachedCommand> = new Map();
  private manifestCache: Map<string, CachedManifest> = new Map();
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * 6.1 Fetch command source code from GitHub repository
   */
  async fetchCommandRepo(repoUrl: string, entryPoint: string = "index.ts"): Promise<string> {
    const parsed = this.parseGitHubUrl(repoUrl);
    if (!parsed) throw new Error(`Invalid GitHub URL: ${repoUrl}`);

    const { owner, repo } = parsed;

    // Fetch file tree from GitHub API
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${entryPoint}`;
    console.log(`[Registry] Fetching from GitHub: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "akka-platform/1.0",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Entry point "${entryPoint}" not found in ${owner}/${repo}`);
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { content?: string; encoding?: string };
    if (!data.content) throw new Error("No content in GitHub response");

    // GitHub API returns base64-encoded content
    if (data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }

    return data.content;
  }

  /**
   * Parse GitHub URL into owner/repo
   */
  private parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    // Handle https://github.com/owner/repo
    const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/);
    if (!match || !match[1] || !match[2]) return null;
    return { owner: match[1], repo: match[2] };
  }

  /**
   * 2.1 Fetch manifest (akka.yaml) from repository root
   */
  async fetchManifest(repoUrl: string): Promise<AkkaManifest> {
    // Check cache first
    const cached = this.manifestCache.get(repoUrl);
    if (cached && Date.now() - cached.fetchedAt < MANIFEST_CACHE_TTL) {
      console.log(`[Registry] Manifest cache hit: ${repoUrl}`);
      return cached.manifest;
    }

    const parsed = this.parseGitHubUrl(repoUrl);
    if (!parsed) throw new Error(`Invalid GitHub URL: ${repoUrl}`);

    const { owner, repo } = parsed;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/akka.yaml`;
    console.log(`[Registry] Fetching manifest from: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "akka-platform/1.0",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Manifest file 'akka.yaml' not found in repository");
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { content?: string; encoding?: string };
    if (!data.content) throw new Error("No content in GitHub response");

    // GitHub API returns base64-encoded content
    const yamlContent = data.encoding === "base64"
      ? Buffer.from(data.content, "base64").toString("utf-8")
      : data.content;

    // 2.2 Parse YAML
    const manifest = this.parseManifest(yamlContent);

    // Cache the manifest
    this.manifestCache.set(repoUrl, { manifest, fetchedAt: Date.now() });
    console.log(`[Registry] Cached manifest: ${repoUrl}`);

    return manifest;
  }

  /**
   * 2.2 Parse YAML manifest content
   */
  private parseManifest(yamlContent: string): AkkaManifest {
    // Simple YAML parser for akka.yaml format
    // Expected format:
    // version: "1"
    // commands:
    //   - slug: "weather"
    //     name: "Weather"
    //     description: "Get weather info"
    //     usage: ".weather <city>"
    //     entryPoint: "weather.js"

    const lines = yamlContent.split("\n");
    let version = "1";
    const commands: AkkaCommand[] = [];
    let currentCommand: Partial<AkkaCommand> = {};
    let inCommands = false;
    let inCommand = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      // Parse version
      if (trimmed.startsWith("version:")) {
        const match = trimmed.match(/version:\s*["']?([^"'\n]+)["']?/);
        if (match) version = match[1] || "1";
        continue;
      }

      // Check for commands section (allow with leading spaces)
      if (trimmed.startsWith("commands:")) {
        inCommands = true;
        continue;
      }

      if (inCommands) {
        // Check for command entry (starts with -)
        if (trimmed.startsWith("- ")) {
          // Save previous command if exists
          if (currentCommand.slug && currentCommand.name) {
            commands.push({
              slug: currentCommand.slug,
              name: currentCommand.name,
              description: currentCommand.description || "",
              usage: currentCommand.usage || "",
              entryPoint: currentCommand.entryPoint || "index.js",
            });
          }
          currentCommand = {};
          inCommand = true;

          // Parse properties on the same line (e.g., "- slug: weather")
          const lineAfterDash = trimmed.slice(2).trim();
          if (lineAfterDash.startsWith("slug:")) {
            const match = lineAfterDash.match(/slug:\s*["']?([^"'\n]+)["']?/);
            if (match) currentCommand.slug = match[1];
          } else if (lineAfterDash.startsWith("name:")) {
            const match = lineAfterDash.match(/name:\s*["']?([^"'\n]+)["']?/);
            if (match) currentCommand.name = match[1];
          } else if (lineAfterDash.startsWith("description:")) {
            const match = lineAfterDash.match(/description:\s*["']?([^"'\n]*)["']?/);
            if (match) currentCommand.description = match[1];
          } else if (lineAfterDash.startsWith("usage:")) {
            const match = lineAfterDash.match(/usage:\s*["']?([^"'\n]*)["']?/);
            if (match) currentCommand.usage = match[1];
          } else if (lineAfterDash.startsWith("entryPoint:") || lineAfterDash.startsWith("entry_point:")) {
            const match = lineAfterDash.match(/(?:entryPoint|entry_point):\s*["']?([^"'\n]+)["']?/);
            if (match) currentCommand.entryPoint = match[1];
          }
          continue;
        }

        // Parse command properties
        if (inCommand) {
          if (trimmed.startsWith("slug:")) {
            const match = trimmed.match(/slug:\s*["']?([^"'\n]+)["']?/);
            if (match) currentCommand.slug = match[1];
          } else if (trimmed.startsWith("name:")) {
            const match = trimmed.match(/name:\s*["']?([^"'\n]+)["']?/);
            if (match) currentCommand.name = match[1];
          } else if (trimmed.startsWith("description:")) {
            const match = trimmed.match(/description:\s*["']?([^"'\n]*)["']?/);
            if (match) currentCommand.description = match[1];
          } else if (trimmed.startsWith("usage:")) {
            const match = trimmed.match(/usage:\s*["']?([^"'\n]*)["']?/);
            if (match) currentCommand.usage = match[1];
          } else if (trimmed.startsWith("entryPoint:") || trimmed.startsWith("entry_point:")) {
            const match = trimmed.match(/(?:entryPoint|entry_point):\s*["']?([^"'\n]+)["']?/);
            if (match) currentCommand.entryPoint = match[1];
          }
        }
      }
    }

    // Don't forget the last command
    if (currentCommand.slug && currentCommand.name) {
      commands.push({
        slug: currentCommand.slug,
        name: currentCommand.name,
        description: currentCommand.description || "",
        usage: currentCommand.usage || "",
        entryPoint: currentCommand.entryPoint || "index.js",
      });
    }

    if (commands.length === 0) {
      throw new Error("No commands found in manifest");
    }

    return { version, commands };
  }

  /**
   * 2.3 Clear manifest cache for a specific repo
   */
  clearManifestCache(repoUrl: string): void {
    this.manifestCache.delete(repoUrl);
    console.log(`[Registry] Cleared manifest cache: ${repoUrl}`);
  }

  /**
   * 6.2 Validate command export
   */
  validateCommandExport(source: string): { name: string; description: string; usage: string } {
    // Validate that source exports required fields using basic pattern matching
    // In production this would use vm2 sandbox evaluation, but for registration we just check structure
    const hasName = /name\s*:\s*['"`](.+?)['"`]/.test(source) ||
      /module\.exports\s*=\s*\{[^}]*name\s*:/.test(source) ||
      /export\s+(?:const|let|var)\s+name\s*=/.test(source);

    const hasDesc = /description\s*:\s*['"`](.+?)['"`]/.test(source) ||
      /export\s+(?:const|let|var)\s+description\s*=/.test(source);

    const hasUsage = /usage\s*:\s*['"`](.+?)['"`]/.test(source);

    const hasHandle = /handle\s*:/.test(source) || /handle\s*=/.test(source) || /export\s+(?:async\s+)?function\s+handle/.test(source);

    const issues: string[] = [];
    if (!hasName) issues.push("Missing 'name' export");
    if (!hasDesc) issues.push("Missing 'description' export");
    if (!hasUsage) issues.push("Missing 'usage' export");
    if (!hasHandle) issues.push("Missing 'handle' function");

    if (issues.length > 0) {
      throw new Error(`Command validation failed:\n- ${issues.join("\n- ")}`);
    }

    // Extract values using regex
    const nameMatch = source.match(/(?:name\s*:\s*['"`]|export\s+const\s+name\s*=\s*['"`])(.+?)['"`]/);
    const descMatch = source.match(/(?:description\s*:\s*['"`]|export\s+const\s+description\s*=\s*['"`])(.+?)['"`]/);
    const usageMatch = source.match(/(?:usage\s*:\s*['"`]|export\s+const\s+usage\s*=\s*['"`])(.+?)['"`]/);

    return {
      name: nameMatch?.[1] || "Untitled",
      description: descMatch?.[1] || "",
      usage: usageMatch?.[1] || "",
    };
  }

  /**
   * 6.3 Cache get
   */
  getCached(cacheKey: string): string | null {
    const entry = this.cache.get(cacheKey);
    if (entry) {
      console.log(`[Registry] Cache hit: ${cacheKey}`);
      return entry.source;
    }
    return null;
  }

  /**
   * 6.3 Cache set
   */
  setCached(cacheKey: string, source: string): void {
    this.cache.set(cacheKey, { source, fetchedAt: Date.now() });
    console.log(`[Registry] Cached: ${cacheKey}`);
  }

  /**
   * 6.4 Refresh a cached command
   */
  async refresh(developerId: number, slug: string, repoUrl: string, entryPoint: string): Promise<void> {
    console.log(`[Registry] Refreshing: dev=${developerId} slug=${slug}`);
    const source = await this.fetchCommandRepo(repoUrl, entryPoint);
    this.setCached(`${developerId}/${slug}`, source);
  }

  /**
   * 6.4 Start periodic cache refresh loop (every hour)
   */
  startRefreshLoop(): void {
    if (this.refreshTimer) return;
    console.log("[Registry] Starting cache refresh loop (every hour)");
    this.refreshTimer = setInterval(() => this.refreshAll(), 3600000);
  }

  stopRefreshLoop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private async refreshAll(): Promise<void> {
    const records = db.select().from(schema.commands).where(eq(schema.commands.status, "active")).all();
    for (const cmd of records) {
      try {
        await this.refresh(cmd.developerId, cmd.slug, cmd.repoUrl, cmd.entryPoint);
      } catch (e) {
        console.error(`[Registry] Refresh failed for ${cmd.slug}:`, e);
      }
    }
  }

/**
 * 6.5 Register a new command
 */
async registerCommand(
    developerId: number,
    slug: string,
    name: string,
    description: string,
    usage: string,
    repoUrl: string,
    entryPoint: string = "index.ts",
    skipValidation: boolean = false
  ): Promise<CommandRecord> {
    // 6.5 Slug uniqueness check per developer
    const existing = db
      .select()
      .from(schema.commands)
      .where(and(eq(schema.commands.developerId, developerId), eq(schema.commands.slug, slug)))
      .get();

    if (existing) {
      throw new Error(`Command with slug "${slug}" already exists for this developer`);
    }

    // Skip GitHub validation if skipValidation is true (for testing/e2e)
    if (!skipValidation) {
      // Fetch and validate
      const source = await this.fetchCommandRepo(repoUrl, entryPoint);
      this.validateCommandExport(source);

      // Cache the source
      this.setCached(`${developerId}/${slug}`, source);
    }

    // Insert into database
    const result = db
      .insert(schema.commands)
      .values({
        developerId,
        slug,
        name,
        description,
        usage,
        repoUrl,
        entryPoint,
        status: "active",
      })
      .returning()
      .get();

    console.log(`[Registry] Registered command: ${slug} (dev=${developerId})`);
    return result;
  }

  /**
   * 3.1 Register a repository (multiple commands from akka.yaml)
   * 3.2 All-or-nothing validation - reject if any command is invalid
   */
  async registerRepository(
    developerId: number,
    repoUrl: string,
    skipValidation: boolean = false
  ): Promise<CommandRecord[]> {
    // Fetch manifest
    const manifest = await this.fetchManifest(repoUrl);

    // 3.3 Check for duplicate slugs within manifest
    const slugCounts = new Map<string, number>();
    for (const cmd of manifest.commands) {
      const count = slugCounts.get(cmd.slug) || 0;
      slugCounts.set(cmd.slug, count + 1);
    }
    const duplicateSlug = [...slugCounts.entries()].find(([, count]) => count > 1);
    if (duplicateSlug) {
      throw new Error(`Duplicate slug '${duplicateSlug[0]}' in manifest`);
    }

    // 3.4 Validate all commands (all-or-nothing)
    const validationErrors: string[] = [];
    for (const cmd of manifest.commands) {
      try {
        if (!skipValidation) {
          // Validate entryPoint exists
          await this.fetchCommandRepo(repoUrl, cmd.entryPoint);
        }
      } catch (e: any) {
        validationErrors.push(`Command '${cmd.slug}': ${e.message}`);
      }
    }

    // If any validation failed, reject entire registration
    if (validationErrors.length > 0) {
      throw new Error(`Command validation failed:\n- ${validationErrors.join("\n- ")}`);
    }

    // 3.5 Check for existing commands in this repo (slug must be unique per repo)
    const existingInRepo = db
      .select()
      .from(schema.commands)
      .where(eq(schema.commands.repoUrl, repoUrl))
      .all();

    if (existingInRepo.length > 0) {
      const existingSlugs = new Set(existingInRepo.map((c) => c.slug));
      const newSlugs = manifest.commands.map((c) => c.slug);
      const conflict = newSlugs.find((s) => existingSlugs.has(s));
      if (conflict) {
        throw new Error(`Command with slug "${conflict}" already exists in this repository`);
      }
    }

    // All validations passed - insert all commands
    const insertedCommands: CommandRecord[] = [];
    for (const cmd of manifest.commands) {
      const result = db
        .insert(schema.commands)
        .values({
          developerId,
          slug: cmd.slug,
          name: cmd.name,
          description: cmd.description,
          usage: cmd.usage,
          repoUrl,
          entryPoint: cmd.entryPoint,
          manifestVersion: manifest.version,
          status: "active",
        })
        .returning()
        .get();

      insertedCommands.push(result);
      console.log(`[Registry] Registered command: ${cmd.slug} from ${repoUrl}`);
    }

    return insertedCommands;
  }

  /**
   * 4.1 Refresh repository - sync commands from updated manifest
   * 4.2-4.4 Detect new, changed, and removed commands
   * 4.5 Update manifestVersion on refresh
   */
  async refreshRepository(
    developerId: number,
    repoUrl: string,
    skipValidation: boolean = false
  ): Promise<{ added: number; updated: number; disabled: number }> {
    // Fetch updated manifest
    const manifest = await this.fetchManifest(repoUrl);

    // Get existing commands for this repo
    const existingCommands = db
      .select()
      .from(schema.commands)
      .where(and(eq(schema.commands.developerId, developerId), eq(schema.commands.repoUrl, repoUrl)))
      .all();

    const existingBySlug = new Map(existingCommands.map((c) => [c.slug, c]));
    const manifestBySlug = new Map(manifest.commands.map((c) => [c.slug, c]));

    let added = 0;
    let updated = 0;
    let disabled = 0;

    // 4.2 Detect new commands (in manifest but not in database)
    for (const [slug, cmd] of manifestBySlug) {
      if (!existingBySlug.has(slug)) {
        // New command - add it
        try {
          if (!skipValidation) {
            await this.fetchCommandRepo(repoUrl, cmd.entryPoint);
          }
          db.insert(schema.commands).values({
            developerId,
            slug: cmd.slug,
            name: cmd.name,
            description: cmd.description,
            usage: cmd.usage,
            repoUrl,
            entryPoint: cmd.entryPoint,
            manifestVersion: manifest.version,
            status: "active",
          }).run();
          added++;
          console.log(`[Registry] Added command: ${slug} on refresh`);
        } catch (e) {
          console.error(`[Registry] Failed to add command ${slug}:`, e);
        }
      }
    }

    // 4.3 Detect changed commands (in both, but metadata differs)
    for (const [slug, existingCmd] of existingBySlug) {
      const manifestCmd = manifestBySlug.get(slug);
      if (manifestCmd) {
        // Check if metadata changed
        const metadataChanged =
          existingCmd.name !== manifestCmd.name ||
          existingCmd.description !== manifestCmd.description ||
          existingCmd.usage !== manifestCmd.usage ||
          existingCmd.entryPoint !== manifestCmd.entryPoint;

        if (metadataChanged) {
          // Update the command
          db.update(schema.commands)
            .set({
              name: manifestCmd.name,
              description: manifestCmd.description,
              usage: manifestCmd.usage,
              entryPoint: manifestCmd.entryPoint,
              manifestVersion: manifest.version,
            })
            .where(eq(schema.commands.id, existingCmd.id))
            .run();
          updated++;
          console.log(`[Registry] Updated command: ${slug} on refresh`);
        } else if (existingCmd.manifestVersion !== manifest.version) {
          // Just update manifest version if changed
          db.update(schema.commands)
            .set({ manifestVersion: manifest.version })
            .where(eq(schema.commands.id, existingCmd.id))
            .run();
        }
      }
    }

    // 4.4 Detect removed commands (in database but not in manifest) - disable them
    for (const [slug, existingCmd] of existingBySlug) {
      if (!manifestBySlug.has(slug)) {
        // Command removed from manifest - disable it
        db.update(schema.commands)
          .set({ status: "disabled" as any })
          .where(eq(schema.commands.id, existingCmd.id))
          .run();
        disabled++;
        console.log(`[Registry] Disabled command: ${slug} on refresh`);
      }
    }

    // Clear manifest cache after refresh
    this.clearManifestCache(repoUrl);

    return { added, updated, disabled };
  }

  /**
   * Delete all commands for a repository
   */
  deleteRepository(developerId: number, repoUrl: string): number {
    // Get count before deleting
    const existing = db
      .select()
      .from(schema.commands)
      .where(and(eq(schema.commands.developerId, developerId), eq(schema.commands.repoUrl, repoUrl)))
      .all();

    const count = existing.length;

    db.delete(schema.commands)
      .where(and(eq(schema.commands.developerId, developerId), eq(schema.commands.repoUrl, repoUrl)))
      .run();

    this.clearManifestCache(repoUrl);
    console.log(`[Registry] Deleted ${count} commands for repo: ${repoUrl}`);
    return count;
  }

  /**
   * Get all repositories for a developer (grouped by repoUrl)
   */
  getRepositories(developerId: number): Array<{ repoUrl: string; commands: CommandRecord[]; manifestVersion: string | null }> {
    const commands = db
      .select()
      .from(schema.commands)
      .where(eq(schema.commands.developerId, developerId))
      .all();

    // Group by repoUrl
    const byRepoUrl = new Map<string, CommandRecord[]>();
    for (const cmd of commands) {
      const existing = byRepoUrl.get(cmd.repoUrl) || [];
      existing.push(cmd);
      byRepoUrl.set(cmd.repoUrl, existing);
    }

    return [...byRepoUrl.entries()].map(([repoUrl, cmds]) => ({
      repoUrl,
      commands: cmds,
      manifestVersion: cmds[0]?.manifestVersion || null,
    }));
  }

  /**
   * 6.7 Get command by developer username + slug (GitHub-style ID)
   */
  getCommandByFullId(fullId: string): CommandRecord | null {
    const [username, slug] = this.parseFullId(fullId);
    if (!username || !slug) return null;

    const result = db
      .select()
      .from(schema.commands)
      .innerJoin(schema.developers, eq(schema.commands.developerId, schema.developers.id))
      .where(
        and(eq(schema.developers.username, username), eq(schema.commands.slug, slug))
      )
      .get();

    if (!result) return null;
    return result.commands;
  }

  /**
   * 6.7 Parse "username/slug" format
   */
  parseFullId(fullId: string): [string, string] {
    const slashIndex = fullId.indexOf("/");
    if (slashIndex === -1) return ["", fullId];
    return [fullId.slice(0, slashIndex), fullId.slice(slashIndex + 1)];
  }

  /**
   * 6.7 Build full ID from developer username and slug
   */
  buildFullId(username: string, slug: string): string {
    return `${username}/${slug}`;
  }

  /**
   * Get all active (published) commands
   */
  getAllActiveCommands(): Array<CommandRecord & { developerUsername: string; repositoryName: string }> {
    const results = db
      .select()
      .from(schema.commands)
      .innerJoin(schema.developers, eq(schema.commands.developerId, schema.developers.id))
      .where(eq(schema.commands.status, "active"))
      .all();

    return results.map((r) => ({
      ...r.commands,
      developerUsername: r.developers.username,
      repositoryName: this.extractRepositoryName(r.commands.repoUrl),
    }));
  }

  /**
   * Extract repository name from repoUrl (e.g., "https://github.com/user/repo" -> "user/repo")
   */
  private extractRepositoryName(repoUrl: string): string {
    const parsed = this.parseGitHubUrl(repoUrl);
    if (parsed) {
      return `${parsed.owner}/${parsed.repo}`;
    }
    // Fallback: try to extract from URL
    const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    return match?.[1] || repoUrl;
  }

  /**
   * Get commands by developer ID
   */
  getCommandsByDeveloper(developerId: number): CommandRecord[] {
    return db
      .select()
      .from(schema.commands)
      .where(eq(schema.commands.developerId, developerId))
      .all();
  }

  /**
   * Search commands (6.4 - includes repository name matching)
   */
  searchCommands(query: string): CommandRecord[] {
    const pattern = `%${query}%`;
    return db
      .select()
      .from(schema.commands)
      .where(
        and(
          eq(schema.commands.status, "active"),
          like(schema.commands.name, pattern) ||
            like(schema.commands.slug, pattern) ||
            like(schema.commands.repoUrl, pattern)
        )
      )
      .all();
  }

  /**
   * Disable/Enable a command
   */
  setCommandStatus(commandId: number, status: "active" | "disabled"): void {
    db.update(schema.commands)
      .set({ status } as any)
      .where(eq(schema.commands.id, commandId))
      .run();
  }

  /**
   * Get cached source for a command
   */
  getCommandSource(developerId: number, slug: string): string | null {
    return this.getCached(`${developerId}/${slug}`);
  }
}

// Singleton
export const commandRegistry = new CommandRegistry();
