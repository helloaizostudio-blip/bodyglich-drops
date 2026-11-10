import { defineConfig } from "drizzle-kit";

// Used only to generate SQL migrations from src/db/schema.ts (`npm run db:generate`).
// Migrations are applied automatically when the app boots.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
