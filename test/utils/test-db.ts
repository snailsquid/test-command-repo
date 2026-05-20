import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "../../src/db/schema";

/**
 * Create an in-memory test database
 */
export function createTestDb() {
  const sqlite = new Database(":memory:");
  
  // Enable foreign keys
  sqlite.exec("PRAGMA foreign_keys = ON");
  
  const db = drizzle(sqlite, { schema });
  
  // Create tables by running migrations or creating schema manually
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      waha_session_id TEXT NOT NULL UNIQUE
    );
    
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_jid TEXT NOT NULL UNIQUE,
      anonymized_id TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS developers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      whatsapp_jid TEXT,
      username TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS developer_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS developer_group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES developer_groups(id),
      developer_id INTEGER NOT NULL REFERENCES developers(id)
    );
    
    CREATE TABLE IF NOT EXISTS commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      developer_id INTEGER NOT NULL REFERENCES developers(id),
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      usage TEXT NOT NULL,
      repo_url TEXT NOT NULL,
      entry_point TEXT NOT NULL DEFAULT 'index.js',
      manifest_version TEXT,
      status TEXT NOT NULL DEFAULT 'active'
    );
    
    CREATE UNIQUE INDEX IF NOT EXISTS commands_repo_url_slug_unique ON commands (repo_url, slug);
    
    CREATE TABLE IF NOT EXISTS installations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      contact_id INTEGER NOT NULL REFERENCES contacts(id),
      command_id INTEGER NOT NULL REFERENCES commands(id),
      user_slug TEXT NOT NULL,
      installed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      contact_id INTEGER NOT NULL REFERENCES contacts(id),
      command_slug TEXT NOT NULL,
      payload TEXT NOT NULL,
      execute_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
    );
    
    CREATE TABLE IF NOT EXISTS registration_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      developer_id INTEGER REFERENCES developers(id),
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS conversation_flows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      contact_id INTEGER NOT NULL REFERENCES contacts(id),
      flow_type TEXT NOT NULL,
      state TEXT NOT NULL,
      data TEXT NOT NULL DEFAULT '{}',
      expires_at TEXT NOT NULL
    );
  `);
  
  return { db, sqlite };
}

/**
 * Reset database - clear all tables
 */
export function resetTestDb(sqlite: Database) {
  sqlite.exec(`
    DELETE FROM conversation_flows;
    DELETE FROM registration_tokens;
    DELETE FROM scheduled_tasks;
    DELETE FROM installations;
    DELETE FROM commands;
    DELETE FROM developer_group_members;
    DELETE FROM developer_groups;
    DELETE FROM developers;
    DELETE FROM users;
    DELETE FROM contacts;
  `);
}

/**
 * Close test database
 */
export function closeTestDb(sqlite: Database) {
  sqlite.close();
}
