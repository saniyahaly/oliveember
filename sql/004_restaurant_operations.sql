BEGIN;

CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 40),
  capacity INTEGER NOT NULL CHECK (capacity BETWEEN 1 AND 50),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS restaurant_table_name_unique
  ON public.restaurant_tables (lower(btrim(name)));

CREATE TABLE IF NOT EXISTS public.restaurant_booking_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
  opens_at TIME NOT NULL DEFAULT '12:00',
  closes_at TIME NOT NULL DEFAULT '22:00',
  advance_days INTEGER NOT NULL DEFAULT 30 CHECK (advance_days BETWEEN 1 AND 365),
  lead_minutes INTEGER NOT NULL DEFAULT 60 CHECK (lead_minutes BETWEEN 0 AND 1440),
  duration_minutes INTEGER NOT NULL DEFAULT 90 CHECK (duration_minutes BETWEEN 30 AND 240),
  order_cancel_minutes INTEGER NOT NULL DEFAULT 15 CHECK (order_cancel_minutes BETWEEN 0 AND 120),
  CHECK (closes_at > opens_at AND closes_at < TIME '24:00' AND
         closes_at - opens_at >= duration_minutes * INTERVAL '1 minute')
);
INSERT INTO public.restaurant_booking_settings (id) VALUES (TRUE) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.restaurant_reservations (
  id UUID PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customer_accounts(id),
  table_id INTEGER NOT NULL REFERENCES public.restaurant_tables(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL CHECK (ends_at > starts_at),
  party_size INTEGER NOT NULL CHECK (party_size BETWEEN 1 AND 50),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  requests TEXT NOT NULL DEFAULT '' CHECK (char_length(requests) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Singleton integer ranges support equality in GiST without an extension.
  CONSTRAINT restaurant_reservation_no_overlap EXCLUDE USING gist (
    int8range(table_id::bigint, table_id::bigint, '[]') WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status IN ('pending', 'confirmed'))
);
CREATE INDEX IF NOT EXISTS restaurant_reservations_customer_start ON public.restaurant_reservations (customer_id, starts_at);
CREATE INDEX IF NOT EXISTS restaurant_reservations_start ON public.restaurant_reservations (starts_at);

CREATE TABLE IF NOT EXISTS public.restaurant_orders (
  id UUID PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customer_accounts(id),
  request_key UUID NOT NULL,
  request_fingerprint TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('dine-in', 'takeaway')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  paid_at TIMESTAMPTZ,
  total NUMERIC(14,2) NOT NULL CHECK (total >= 0),
  reservation_id UUID REFERENCES public.restaurant_reservations(id),
  table_id INTEGER REFERENCES public.restaurant_tables(id),
  notes TEXT NOT NULL DEFAULT '' CHECK (char_length(notes) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, request_key),
  CHECK ((order_type = 'dine-in' AND reservation_id IS NOT NULL AND table_id IS NOT NULL) OR
         (order_type = 'takeaway' AND reservation_id IS NULL AND table_id IS NULL)),
  CHECK ((payment_status = 'paid') = (paid_at IS NOT NULL)),
  CHECK (status <> 'cancelled' OR payment_status = 'unpaid'),
  CHECK (status <> 'completed' OR payment_status = 'paid'),
  CHECK (status <> 'served' OR order_type = 'dine-in')
);
-- Require a dine-in order to reference its own customer's reservation and
-- the table assigned to that reservation. Takeaway orders have no reference.
CREATE UNIQUE INDEX IF NOT EXISTS restaurant_reservations_order_reference
  ON public.restaurant_reservations (id, customer_id, table_id);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.restaurant_orders'::regclass AND conname = 'restaurant_orders_reservation_owner'
  ) THEN
    ALTER TABLE public.restaurant_orders ADD CONSTRAINT restaurant_orders_reservation_owner
      FOREIGN KEY (reservation_id, customer_id, table_id)
      REFERENCES public.restaurant_reservations (id, customer_id, table_id);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS restaurant_orders_customer_created ON public.restaurant_orders (customer_id, created_at);
CREATE INDEX IF NOT EXISTS restaurant_orders_created ON public.restaurant_orders (created_at);
CREATE INDEX IF NOT EXISTS restaurant_orders_reservation ON public.restaurant_orders (reservation_id);
CREATE INDEX IF NOT EXISTS restaurant_orders_paid ON public.restaurant_orders (paid_at) WHERE paid_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.restaurant_order_items (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.restaurant_orders(id),
  menu_item_id INTEGER REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(14,2) GENERATED ALWAYS AS (unit_price * quantity) STORED
);
CREATE INDEX IF NOT EXISTS restaurant_order_items_order ON public.restaurant_order_items (order_id);
CREATE INDEX IF NOT EXISTS restaurant_order_items_menu ON public.restaurant_order_items (menu_item_id);

CREATE TABLE IF NOT EXISTS public.restaurant_action_limits (
  customer_id UUID NOT NULL REFERENCES public.customer_accounts(id),
  action TEXT NOT NULL CHECK (action IN ('reserve', 'order')),
  window_started_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts BETWEEN 1 AND 12),
  PRIMARY KEY (customer_id, action)
);

-- Use one definition of availability for both browsing and reservation writes.
CREATE OR REPLACE FUNCTION public.restaurant_available_slots(day DATE, guests INTEGER)
RETURNS TABLE (table_id INTEGER, table_name TEXT, starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ)
LANGUAGE SQL STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
  SELECT t.id, t.name, slot.local_start AT TIME ZONE cfg.timezone,
         (slot.local_start AT TIME ZONE cfg.timezone) + cfg.duration_minutes * INTERVAL '1 minute'
  FROM public.restaurant_booking_settings AS cfg
  CROSS JOIN public.restaurant_tables AS t
  CROSS JOIN LATERAL generate_series(day + cfg.opens_at, day + cfg.closes_at, INTERVAL '30 minutes') AS slot(local_start)
  WHERE cfg.id AND t.active AND guests BETWEEN 1 AND t.capacity
    AND day BETWEEN (NOW() AT TIME ZONE cfg.timezone)::date AND
                    (NOW() AT TIME ZONE cfg.timezone)::date + cfg.advance_days
    AND slot.local_start AT TIME ZONE cfg.timezone >= NOW() + cfg.lead_minutes * INTERVAL '1 minute'
    AND (slot.local_start AT TIME ZONE cfg.timezone) AT TIME ZONE cfg.timezone = slot.local_start
    AND ((slot.local_start AT TIME ZONE cfg.timezone) + cfg.duration_minutes * INTERVAL '1 minute')
          AT TIME ZONE cfg.timezone <= day + cfg.closes_at
    AND NOT EXISTS (
      SELECT 1 FROM public.restaurant_reservations AS r
      WHERE r.table_id = t.id AND r.status IN ('pending','confirmed')
        AND tstzrange(r.starts_at,r.ends_at,'[)') &&
            tstzrange(slot.local_start AT TIME ZONE cfg.timezone,
                      (slot.local_start AT TIME ZONE cfg.timezone) + cfg.duration_minutes * INTERVAL '1 minute','[)')
    )
$$;

COMMIT;
