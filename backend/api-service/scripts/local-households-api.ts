import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import pg from "pg";
import { z } from "zod";

const { Pool } = pg;
const app = new Hono();
// Allow local AquaLoop frontend to access the API
app.use(
  "*",
  cors({
    origin: ["http://localhost:8081", "http://127.0.0.1:8081"],
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
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

const orderSchema = z.object({
  request_id: z.string().min(1).max(200),
  household_id: z.string().min(1),
  delivery_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  run: z.enum(["morning", "afternoon"]),
  intent: z.enum(["new", "change", "skip", "cancel", "return_only", "query"]),
  quantity: z.number().int().nonnegative().nullable(),
  returns_requested: z.number().int().nonnegative(),
  source: z.enum(["standing", "one_off", "pickup_only"]),
  message_text: z.string().max(10000),
  confidence: z.number().min(0).max(1),
  review_reasons: z.array(z.string()).default([]),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      qty: z.number().int().positive(),
    }),
  ),
  return_details: z
    .object({
      "20L_container": z.number().int().nonnegative().optional(),
      milk_bottle: z.number().int().nonnegative().optional(),
      crate: z.number().int().nonnegative().optional(),
    })
    .strict(),
});

// Retrieve cloud orders
app.get("/api/orders", async (c) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM aqualoop.orders
       ORDER BY received_at DESC
       LIMIT 500`,
    );

    return c.json({
      success: true,
      count: result.rowCount,
      orders: result.rows,
    });
  } catch (error) {
    console.error("Order retrieval failed:", error);
    return c.json(
      {
        success: false,
        error: "Unable to retrieve orders",
      },
      500,
    );
  }
});

// Save incoming orders for validation and review
app.post("/api/orders", async (c) => {
  try {
    const validation = orderSchema.safeParse(await c.req.json());

    if (!validation.success) {
      return c.json(
        {
          success: false,
          error: "Invalid order data",
          details: validation.error.flatten(),
        },
        400,
      );
    }

    const o = validation.data;

    const household = await pool.query(
      `SELECT household_id
       FROM aqualoop.households
       WHERE household_id = $1 AND active = true`,
      [o.household_id],
    );

    if (household.rowCount === 0) {
      return c.json(
        {
          success: false,
          error: "Active household not found",
        },
        404,
      );
    }

    const result = await pool.query(
      `INSERT INTO aqualoop.orders (
        request_id,
        household_id,
        delivery_date,
        run,
        intent,
        quantity,
        returns_requested,
        source,
        status,
        message_text,
        confidence,
        review_reasons,
        items,
        return_details
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, 'owner_review', $9, $10,
        $11, $12::jsonb, $13::jsonb
      )
      ON CONFLICT (request_id) DO NOTHING
      RETURNING *`,
      [
        o.request_id,
        o.household_id,
        o.delivery_date,
        o.run,
        o.intent,
        o.quantity,
        o.returns_requested,
        o.source,
        o.message_text,
        o.confidence,
        o.review_reasons,
        JSON.stringify(o.items),
        JSON.stringify(o.return_details),
      ],
    );

    if (result.rowCount === 0) {
      return c.json(
        {
          success: false,
          error: "Request ID already exists",
        },
        409,
      );
    }

    return c.json(
      {
        success: true,
        order: result.rows[0],
      },
      201,
    );
  } catch (error) {
    console.error("Order creation failed:", error);

    return c.json(
      {
        success: false,
        error: "Unable to save order",
      },
      500,
    );
  }
});

const reviewSchema = z
  .object({
    status: z.enum(["confirmed", "rejected"]),
    edit: z
      .object({
        delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        run: z.enum(["morning", "afternoon"]),
        quantity: z.number().int().nonnegative(),
        items: z
          .array(
            z.object({
              productId: z.string().min(1),
              qty: z.number().int().positive(),
            }),
          )
          .min(1),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((value) => !value.edit || value.status === "confirmed", {
    message: "Edited orders must be confirmed",
  });

// Update an order after owner review
app.patch("/api/orders/:id", async (c) => {
  try {
    const id = c.req.param("id");

    if (!/^[1-9]\d{0,18}$/.test(id)) {
      return c.json(
        {
          success: false,
          error: "Invalid order ID",
        },
        400,
      );
    }

    const validation = reviewSchema.safeParse(await c.req.json());

    if (!validation.success) {
      return c.json(
        {
          success: false,
          error: "Invalid review details",
        },
        400,
      );
    }

    const { status, edit } = validation.data;

    const result = edit
      ? await pool.query(
          `UPDATE aqualoop.orders
           SET status = 'confirmed',
               delivery_date = $1,
               run = $2,
               quantity = $3,
               items = $4::jsonb,
               intent = 'new',
               source = 'one_off',
               run_id = NULL,
               updated_at = NOW()
           WHERE order_id = $5
             AND status = 'owner_review'
           RETURNING *`,
          [
            edit.delivery_date,
            edit.run,
            edit.quantity,
            JSON.stringify(edit.items),
            id,
          ],
        )
      : await pool.query(
          `UPDATE aqualoop.orders
           SET status = $1,
               updated_at = NOW()
           WHERE order_id = $2
             AND status = 'owner_review'
           RETURNING *`,
          [status, id],
        );

    if (result.rowCount === 0) {
      return c.json(
        {
          success: false,
          error: "Order not found or already reviewed",
        },
        409,
      );
    }

    return c.json({
      success: true,
      order: result.rows[0],
    });
  } catch (error) {
    console.error("Order review update failed:", error);

    return c.json(
      {
        success: false,
        error: "Unable to update order",
      },
      500,
    );
  }
});

// Retrieve delivery runs
app.get("/api/delivery-runs", async (c) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM aqualoop.delivery_runs
       ORDER BY delivery_date, run
       LIMIT 500`,
    );

    return c.json({
      success: true,
      count: result.rowCount,
      runs: result.rows,
    });
  } catch (error) {
    console.error("Delivery retrieval failed:", error);
    return c.json(
      {
        success: false,
        error: "Unable to retrieve delivery runs",
      },
      500,
    );
  }
});

// Retrieve recorded container returns
app.get("/api/container-returns", async (c) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM aqualoop.container_returns
       ORDER BY returned_at DESC
       LIMIT 500`,
    );

    return c.json({
      success: true,
      count: result.rowCount,
      returns: result.rows,
    });
  } catch (error) {
    console.error("Returns retrieval failed:", error);
    return c.json(
      {
        success: false,
        error: "Unable to retrieve container returns",
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
