import { db, schema } from "../db";
import { eq, and } from "drizzle-orm";
import type { UserRecord, InstallationRecord } from "../types";

/**
 * Generate an anonymized ID from a phone JID
 * Uses Bun's crypto hash with a random suffix for uniqueness
 */
function generateAnonymizedId(jid: string): string {
  const hash = Bun.hash(jid).toString(36);
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${hash}_${suffix}`;
}

/**
 * UserService - Handles user lookup, creation, and installation management
 */
export class UserService {
  /**
   * Find a user by their phone JID
   */
  findByJid(jid: string): UserRecord | null {
    const user = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phoneJid, jid))
      .get();

    return user || null;
  }

  /**
   * Get or create a user by their phone JID
   * Creates with anonymized ID if not found
   */
  getOrCreateUser(jid: string): UserRecord {
    // Try to find existing user
    const existing = this.findByJid(jid);
    if (existing) {
      return existing;
    }

    // Create new user with anonymized ID
    const anonymizedId = generateAnonymizedId(jid);
    
    db.insert(schema.users)
      .values({
        phoneJid: jid,
        anonymizedId,
      })
      .run();

    // Fetch and return the newly created user
    const newUser = this.findByJid(jid);
    if (!newUser) {
      throw new Error(`Failed to create user for JID: ${jid}`);
    }

    console.log(`[UserService] Created new user ${anonymizedId} for JID ${jid}`);
    return newUser;
  }

  /**
   * Get a user by their ID
   */
  findById(userId: number): UserRecord | null {
    const user = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .get();

    return user || null;
  }

  /**
   * Get installation record by user, contact, and slug
   */
  getInstallation(userId: number, contactId: number, slug: string): InstallationRecord | null {
    const installation = db
      .select()
      .from(schema.installations)
      .innerJoin(
        schema.commands,
        eq(schema.installations.commandId, schema.commands.id)
      )
      .where(
        and(
          eq(schema.installations.userId, userId),
          eq(schema.installations.contactId, contactId),
          eq(schema.commands.slug, slug)
        )
      )
      .get();

    if (!installation) return null;

    return {
      id: installation.installations.id,
      userId: installation.installations.userId,
      contactId: installation.installations.contactId,
      commandId: installation.installations.commandId,
      userSlug: installation.installations.userSlug,
      installedAt: installation.installations.installedAt,
    };
  }

  /**
   * Get installation by user slug (custom name used by user)
   */
  getInstallationByUserSlug(
    userId: number,
    contactId: number,
    userSlug: string
  ): InstallationRecord | null {
    const installation = db
      .select()
      .from(schema.installations)
      .innerJoin(
        schema.commands,
        eq(schema.installations.commandId, schema.commands.id)
      )
      .where(
        and(
          eq(schema.installations.userId, userId),
          eq(schema.installations.contactId, contactId),
          eq(schema.installations.userSlug, userSlug)
        )
      )
      .get();

    if (!installation) return null;

    return {
      id: installation.installations.id,
      userId: installation.installations.userId,
      contactId: installation.installations.contactId,
      commandId: installation.installations.commandId,
      userSlug: installation.installations.userSlug,
      installedAt: installation.installations.installedAt,
    };
  }

  /**
   * Install a command for a user on a contact
   */
  installCommand(
    userId: number,
    contactId: number,
    commandId: number,
    userSlug: string
  ): InstallationRecord {
    // Check if already installed
    const existing = db
      .select()
      .from(schema.installations)
      .where(
        and(
          eq(schema.installations.userId, userId),
          eq(schema.installations.contactId, contactId),
          eq(schema.installations.commandId, commandId)
        )
      )
      .get();

    if (existing) {
      return {
        id: existing.id,
        userId: existing.userId,
        contactId: existing.contactId,
        commandId: existing.commandId,
        userSlug: existing.userSlug,
        installedAt: existing.installedAt,
      };
    }

    db.insert(schema.installations)
      .values({
        userId,
        contactId,
        commandId,
        userSlug,
      })
      .run();

    const installation = db
      .select()
      .from(schema.installations)
      .where(eq(schema.installations.id, db.select().from(schema.installations).all().at(-1)?.id || 0))
      .get();

    if (!installation) {
      throw new Error("Failed to create installation");
    }

    return {
      id: installation.id,
      userId: installation.userId,
      contactId: installation.contactId,
      commandId: installation.commandId,
      userSlug: installation.userSlug,
      installedAt: installation.installedAt,
    };
  }

  /**
   * Uninstall a command by user slug
   */
uninstallCommand(userId: number, contactId: number, userSlug: string): boolean {
     db
       .delete(schema.installations)
       .where(
         and(
           eq(schema.installations.userId, userId),
           eq(schema.installations.contactId, contactId),
           eq(schema.installations.userSlug, userSlug)
         )
       );
     return true;
   }

  /**
   * Get all installations for a user on a contact (with command details)
   */
  getUserInstallations(userId: number, contactId: number) {
    const installations = db
      .select({
        installation: schema.installations,
        command: schema.commands,
      })
      .from(schema.installations)
      .innerJoin(
        schema.commands,
        eq(schema.installations.commandId, schema.commands.id)
      )
      .where(
        and(
          eq(schema.installations.userId, userId),
          eq(schema.installations.contactId, contactId)
        )
      )
      .all();

    return installations.map((row) => ({
      id: row.installation.id,
      userId: row.installation.userId,
      contactId: row.installation.contactId,
      commandId: row.installation.commandId,
      userSlug: row.installation.userSlug,
      installedAt: row.installation.installedAt,
      command: {
        id: row.command.id,
        developerId: row.command.developerId,
        slug: row.command.slug,
        name: row.command.name,
        description: row.command.description,
        usage: row.command.usage,
        repoUrl: row.command.repoUrl,
        entryPoint: row.command.entryPoint,
        status: row.command.status,
      },
    }));
  }

  /**
   * Check if a command is installed for a user on a contact
   */
  isInstalled(userId: number, contactId: number, slug: string): boolean {
    // Check by user slug first
    const byUserSlug = this.getInstallationByUserSlug(userId, contactId, slug);
    if (byUserSlug) return true;

    // Check by command slug
    const bySlug = db
      .select()
      .from(schema.installations)
      .innerJoin(
        schema.commands,
        eq(schema.installations.commandId, schema.commands.id)
      )
      .where(
        and(
          eq(schema.installations.userId, userId),
          eq(schema.installations.contactId, contactId),
          eq(schema.commands.slug, slug)
        )
      )
      .get();

    return !!bySlug;
  }

  /**
   * Rename an installation's user slug
   */
  renameInstallation(
    userId: number,
    contactId: number,
    oldSlug: string,
    newSlug: string
  ): boolean {
    const result = db
.update(schema.installations)
       .set({ userSlug: newSlug })
       .where(
         and(
           eq(schema.installations.userId, userId),
           eq(schema.installations.contactId, contactId),
           eq(schema.installations.userSlug, oldSlug)
         )
       );
   return true;
   }

   /**
    * Get all user slugs for a given user+contact pair
    */
   getUserSlugs(userId: number, contactId: number): string[] {
    const installations = db
      .select({ userSlug: schema.installations.userSlug })
      .from(schema.installations)
      .where(
        and(
          eq(schema.installations.userId, userId),
          eq(schema.installations.contactId, contactId)
        )
      )
      .all();

    return installations.map((i) => i.userSlug);
  }
}

// Singleton instance
export const userService = new UserService();
