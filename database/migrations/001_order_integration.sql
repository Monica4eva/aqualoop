BEGIN;

ALTER TABLE aqualoop.orders
ADD COLUMN IF NOT EXISTS items
JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE aqualoop.orders
ADD COLUMN IF NOT EXISTS return_details
JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE aqualoop.orders
ADD COLUMN IF NOT EXISTS request_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS orders_request_id_unique
ON aqualoop.orders (request_id);

COMMIT;
