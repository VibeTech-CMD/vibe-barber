-- ============================================================================
-- Vibe Barber — Migration 0001: Initial Schema, Constraints & Atomic Functions
-- Database: PostgreSQL (Supabase) | Currency: BRL (integer cents)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 1. Barbershops (prepared for future multi-tenant expansion)
CREATE TABLE IF NOT EXISTS public.barbershops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  whatsapp TEXT,
  instagram TEXT,
  address TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Profiles (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 3. Memberships (RBAC per barbershop: client | barber | admin)
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('client', 'barber', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (barbershop_id, profile_id, role)
);

-- 4. Barbers
CREATE TABLE IF NOT EXISTS public.barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  avatar_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Services (all monetary values stored as integer cents)
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Geral',
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  buffer_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_minutes >= 0),
  deposit_cents INTEGER NOT NULL DEFAULT 1000 CHECK (deposit_cents >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Barber <-> Services eligibility
CREATE TABLE IF NOT EXISTS public.barber_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  UNIQUE (barber_id, service_id)
);

-- 7. Working Hours (0 = Sunday .. 6 = Saturday)
CREATE TABLE IF NOT EXISTS public.working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_end TIME,
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (barber_id, weekday)
);

-- 8. Time Blocks
CREATE TABLE IF NOT EXISTS public.time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL DEFAULT 'Bloqueio manual',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

-- 9. Appointments with Exclusion Constraint preventing double-booking
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  customer_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE RESTRICT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (
    status IN (
      'pending_payment', 'confirmed', 'in_progress',
      'completed', 'cancelled', 'expired', 'no_show', 'transferred'
    )
  ),
  total_price_cents INTEGER NOT NULL CHECK (total_price_cents >= 0),
  deposit_cents INTEGER NOT NULL DEFAULT 0 CHECK (deposit_cents >= 0),
  appointment_code TEXT NOT NULL UNIQUE,
  notes TEXT,
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_at > start_at),
  -- Prevent overlapping active bookings for the same barber at DB level
  CONSTRAINT no_overlapping_active_appointments
    EXCLUDE USING gist (
      barber_id WITH =,
      tstzrange(start_at, end_at, '[)') WITH &&
    )
    WHERE (status IN ('pending_payment', 'confirmed', 'in_progress'))
);

CREATE INDEX IF NOT EXISTS idx_appointments_barber_start ON public.appointments(barber_id, start_at);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON public.appointments(customer_profile_id);

-- 10. Appointment Items (immutable service snapshots)
CREATE TABLE IF NOT EXISTS public.appointment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  service_name_snapshot TEXT NOT NULL,
  duration_snapshot INTEGER NOT NULL,
  price_snapshot_cents INTEGER NOT NULL
);

-- 11. Payments (PSP-agnostic abstraction)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'paid', 'expired', 'cancelled', 'refunded', 'partially_refunded')
  ),
  provider TEXT NOT NULL DEFAULT 'demo_pix',
  external_id TEXT UNIQUE,
  payment_type TEXT NOT NULL DEFAULT 'deposit' CHECK (payment_type IN ('deposit', 'balance', 'refund')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Transfers (Repasse de horários)
CREATE TABLE IF NOT EXISTS public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  original_customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (
    status IN ('available', 'negotiating', 'claimed_pending', 'completed', 'cancelled', 'expired')
  ),
  offered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transfers_one_active_per_appointment
  ON public.transfers(appointment_id)
  WHERE status IN ('available', 'negotiating', 'claimed_pending');

-- 13. Transfer Claims
CREATE TABLE IF NOT EXISTS public.transfer_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES public.transfers(id) ON DELETE CASCADE,
  claiming_customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (
    status IN ('pending_payment', 'completed', 'expired', 'cancelled')
  ),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Waitlist Entries
CREATE TABLE IF NOT EXISTS public.waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  customer_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES public.barbers(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  preferred_date DATE NOT NULL,
  preferred_period TEXT NOT NULL CHECK (preferred_period IN ('morning', 'afternoon', 'evening', 'any')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'offered', 'fulfilled', 'cancelled', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Swap Requests (Troca atômica entre clientes)
CREATE TABLE IF NOT EXISTS public.swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_a_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  appointment_b_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  note TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (appointment_a_id <> appointment_b_id)
);

-- 16. Activity Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  reference_id UUID,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. Settings
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (barbershop_id, setting_key)
);

-- ============================================================================
-- Backend Helper Functions (Expiration & Atomic Swap)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.expire_pending_appointments()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.appointments
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending_payment'
    AND expires_at IS NOT NULL
    AND expires_at < now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  UPDATE public.payments p
  SET status = 'expired', updated_at = now()
  FROM public.appointments a
  WHERE p.appointment_id = a.id
    AND a.status = 'expired'
    AND p.status = 'pending';

  RETURN expired_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_swap_request(p_swap_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_swap public.swap_requests%ROWTYPE;
  v_a public.appointments%ROWTYPE;
  v_b public.appointments%ROWTYPE;
BEGIN
  SELECT * INTO v_swap FROM public.swap_requests WHERE id = p_swap_id FOR UPDATE;
  IF NOT FOUND OR v_swap.status <> 'pending' THEN
    RAISE EXCEPTION 'Proposta de troca inválida ou não pendente';
  END IF;

  SELECT * INTO v_a FROM public.appointments WHERE id = v_swap.appointment_a_id FOR UPDATE;
  SELECT * INTO v_b FROM public.appointments WHERE id = v_swap.appointment_b_id FOR UPDATE;

  IF v_a.status <> 'confirmed' OR v_b.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Ambas as reservas devem estar confirmadas';
  END IF;

  -- Swap owners atomically while preserving timestamps, barbers and paid deposits
  UPDATE public.appointments SET customer_profile_id = v_b.customer_profile_id, updated_at = now() WHERE id = v_a.id;
  UPDATE public.appointments SET customer_profile_id = v_a.customer_profile_id, updated_at = now() WHERE id = v_b.id;

  UPDATE public.swap_requests SET status = 'accepted', updated_at = now() WHERE id = v_swap.id;
END;
$$;
