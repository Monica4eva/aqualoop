import { serve } from "@hono/node-server";
import { Hono } from "hono";
import pg from "pg";

const { Pool } = pg;

const app = new Hono();

// Connect to the local AquaLoop PostgreSQL database.
// Credentials are read from environment variables.
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "AquaLoop",
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

// Local development health check
app.get("/health", (c) => {
  return c.json({ status: "ok", service: "AquaLoop Local API" });
});

// Retrieve fictional households for local testing
app.get("/api/households", async (c) => {
  try {
    const result = await pool.query(
      "SELECT * FROM aqualoop.households LIMIT 20",
    );

    return c.json({
      success: true,
      count: result.rowCount,
      households: result.rows,
    });
  } catch (error) {
    console.error("Database query failed:", error);
    return c.json({ success: false, error: "Database unavailable" }, 500);
  }
});

serve({
  fetch: app.fetch,
  port: 3001,
  hostname: "127.0.0.1",
});

const port = Number(process.env.PORT || 3001);

serve({
  fetch: app.fetch,
  port,
  hostname: "0.0.0.0",
});

console.log(`AquaLoop API running on port ${port}`);
