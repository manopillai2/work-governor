import { defineConfig } from "drizzle-kit";

if (!process.env.LEARNING_DATABASE_URL) {
  throw new Error("LEARNING_DATABASE_URL is not set");
}

export default defineConfig({
  schema: "./src/db/learning-schema.ts",
  out: "./drizzle-learning",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.LEARNING_DATABASE_URL,
  },
});
