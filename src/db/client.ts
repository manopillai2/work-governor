import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

type Schema = typeof schema;

let instance: NodePgDatabase<Schema> | undefined;

function getDb(): NodePgDatabase<Schema> {
  if (!instance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    instance = drizzle(pool, { schema });
  }

  return instance;
}

export const db = new Proxy({} as NodePgDatabase<Schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
