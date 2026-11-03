-- D1 Migration: Sovereign Courier & Escrow Tickets Table
-- Database: sendeke-production-d1
-- Account: a7309d340cc7d985372a37166d4f3ea4

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  items_json TEXT, -- Complete itemized manifest for kitchen bag staple / driver reference
  special_instructions TEXT,
  total_cents INTEGER NOT NULL,
  food_subtotal_cents INTEGER NOT NULL,
  courier_fee_cents INTEGER DEFAULT 1000,
  tip_cents INTEGER DEFAULT 250,
  stripe_intent_id TEXT NOT NULL,
  stripe_payment_method_id TEXT,
  handshake_pin TEXT NOT NULL,
  status TEXT DEFAULT 'ESCROW_AUTHORIZED', -- ESCROW_AUTHORIZED -> EN_ROUTE -> AT_DOOR -> DELIVERED_AND_CAPTURED
  courier_gps TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  settled_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at);
