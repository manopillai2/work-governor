import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./learning-schema";

type Schema = typeof schema;

let instance: NodePgDatabase<Schema> | undefined;

function getLearningDb(): NodePgDatabase<Schema> {
  if (!instance) {
    if (!process.env.LEARNING_DATABASE_URL) {
      throw new Error("LEARNING_DATABASE_URL is not set");
    }

    const pool = new Pool({
      connectionString: process.env.LEARNING_DATABASE_URL,
    });

    instance = drizzle(pool, { schema });
  }

  return instance;
}

export const learningDb = new Proxy({} as NodePgDatabase<Schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getLearningDb(), prop, receiver);
  },
});
