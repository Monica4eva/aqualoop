import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import pg from "pg";

const { Pool } = pg;
const app = new Hono();
// Allow local AquaLoop frontend to access the API
app.use(
  "*",
  cors({
    origin: ["http://localhost:8081", "http://127.0.0.1:8081"],
    allowMethods: ["GET", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

// PostgreSQL connection for local and cloud environments
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "AquaLoop",
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 5,
});

// API health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "AquaLoop API",
  });
});

// Retrieve households from PostgreSQL
app.get("/api/households", async (c) => {
  try {
    const result = await pool.query(
      "SELECT * FROM aqualoop.households ORDER BY household_id LIMIT 20",
    );

    return c.json({
      success: true,
      count: result.rowCount,
      households: result.rows,
    });
  } catch (error) {
    console.error("Database query failed:", error);

    return c.json(
      {
        success: false,
        error: "Database unavailable",
      },
      500,
    );
  }
});

// Start a single server
const port = Number(process.env.PORT || 3001);

serve({
  fetch: app.fetch,
  port,
  hostname: "0.0.0.0",
});

console.log(`AquaLoop API running on port ${port}`);
