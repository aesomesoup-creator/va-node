import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

const { Pool } = pg;

let db: ReturnType<typeof drizzle> | null = null;
let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

export function getDb() {
  if (!db) {
    db = drizzle(getPool(), { schema });
  }
  return db;
}

export function isDbAvailable() {
  return Boolean(process.env.DATABASE_URL);
}

// Create tables if they don't exist — runs once at startup
export async function initDb() {
  if (!isDbAvailable()) return;
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        google_id TEXT UNIQUE,
        email TEXT,
        name TEXT NOT NULL,
        avatar_url TEXT,
        is_guest BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_anime (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        anilist_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        cover_image TEXT,
        position_x REAL NOT NULL DEFAULT 0,
        position_y REAL NOT NULL DEFAULT 0,
        added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT user_anime_unique UNIQUE (user_id, anilist_id)
      );

      CREATE TABLE IF NOT EXISTS anime_characters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        anilist_anime_id INTEGER NOT NULL,
        anilist_character_id INTEGER NOT NULL,
        character_name TEXT NOT NULL,
        character_image TEXT,
        seiyuu_id INTEGER,
        seiyuu_name TEXT,
        seiyuu_image TEXT,
        CONSTRAINT anime_char_unique UNIQUE (anilist_anime_id, anilist_character_id)
      );
    `);
    console.log("✓ DB tables ready");
  } catch (err) {
    console.error("✗ DB init error:", err);
  } finally {
    client.release();
  }
}

export { schema };
