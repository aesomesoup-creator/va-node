import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

let db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL not set");
    }
    const sql = neon(process.env.DATABASE_URL);
    db = drizzle(sql, { schema });
  }
  return db;
}

export function isDbAvailable() {
  return Boolean(process.env.DATABASE_URL);
}

export { schema };
