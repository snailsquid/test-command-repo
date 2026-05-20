import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// 2.1 contacts table
export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  wahaSessionId: text("waha_session_id").notNull().unique(),
});

// 2.2 users table
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  phoneJid: text("phone_jid").notNull().unique(),
  anonymizedId: text("anonymized_id").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// 2.3 developers table
export const developers = sqliteTable("developers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  whatsappJid: text("whatsapp_jid"),
  username: text("username").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// 2.4 developer_groups table
export const developerGroups = sqliteTable("developer_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// 2.5 developer_group_members table
export const developerGroupMembers = sqliteTable("developer_group_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  groupId: integer("group_id")
    .notNull()
    .references(() => developerGroups.id),
  developerId: integer("developer_id")
    .notNull()
    .references(() => developers.id),
});

// 2.6 commands table
export const commands = sqliteTable("commands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  developerId: integer("developer_id")
    .notNull()
    .references(() => developers.id),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  usage: text("usage").notNull(),
  repoUrl: text("repo_url").notNull(),
  entryPoint: text("entry_point").notNull().default("index.js"),
  manifestVersion: text("manifest_version"),
  status: text("status", { enum: ["active", "disabled", "pending"] })
    .notNull()
    .default("active"),
});

// 2.7 installations table
export const installations = sqliteTable("installations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  contactId: integer("contact_id")
    .notNull()
    .references(() => contacts.id),
  commandId: integer("command_id")
    .notNull()
    .references(() => commands.id),
  userSlug: text("user_slug").notNull(),
  installedAt: text("installed_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// 2.8 scheduled_tasks table
export const scheduledTasks = sqliteTable("scheduled_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  contactId: integer("contact_id")
    .notNull()
    .references(() => contacts.id),
  commandSlug: text("command_slug").notNull(),
  payload: text("payload").notNull(),
  executeAt: text("execute_at").notNull(),
  status: text("status", { enum: ["pending", "executed", "failed"] })
    .notNull()
    .default("pending"),
});

// 2.9 registration_tokens table
export const registrationTokens = sqliteTable("registration_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  developerId: integer("developer_id").references(() => developers.id),
  used: integer("used", { mode: "boolean" }).notNull().default(false),
  expiresAt: text("expires_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// 2.11 sessions table
export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  developerId: integer("developer_id")
    .notNull()
    .references(() => developers.id),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// 2.10 conversation_flows table
export const conversationFlows = sqliteTable("conversation_flows", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  contactId: integer("contact_id")
    .notNull()
    .references(() => contacts.id),
  flowType: text("flow_type").notNull(),
  state: text("state").notNull(),
  data: text("data").notNull().default("{}"),
  expiresAt: text("expires_at").notNull(),
});
