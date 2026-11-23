-- ============================================================================
-- Vibe Barber — Migration 0002: Row Level Security (RLS) & Privacy Views
-- ============================================================================

ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Helper: current user's profile ID
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Helper: check role in barbershop
CREATE OR REPLACE FUNCTION public.has_barbershop_role(p_barbershop_id UUID, p_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    JOIN public.profiles p ON p.id = m.profile_id
    WHERE p.auth_user_id = auth.uid()
      AND m.barbershop_id = p_barbershop_id
      AND m.status = 'active'
      AND m.role = ANY(p_roles)
  );
$$;

-- Public catalog read policies
CREATE POLICY "Public read barbershops" ON public.barbershops FOR SELECT USING (true);
CREATE POLICY "Public read active barbers" ON public.barbers FOR SELECT USING (active = true OR public.has_barbershop_role(barbershop_id, ARRAY['admin','barber']));
CREATE POLICY "Public read active services" ON public.services FOR SELECT USING (active = true OR public.has_barbershop_role(barbershop_id, ARRAY['admin','barber']));
CREATE POLICY "Public read barber_services" ON public.barber_services FOR SELECT USING (true);
CREATE POLICY "Public read working_hours" ON public.working_hours FOR SELECT USING (true);

-- Profiles: own profile or staff
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT
  USING (auth_user_id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE
  USING (auth_user_id = auth.uid());

-- Appointments: customer owns it, barber assigned to it, or admin of barbershop
CREATE POLICY "Appointments read" ON public.appointments FOR SELECT
  USING (
    customer_profile_id = public.current_profile_id()
    OR public.has_barbershop_role(barbershop_id, ARRAY['admin', 'barber'])
  );

CREATE POLICY "Appointments insert client or staff" ON public.appointments FOR INSERT
  WITH CHECK (
    customer_profile_id = public.current_profile_id()
    OR public.has_barbershop_role(barbershop_id, ARRAY['admin', 'barber'])
  );

CREATE POLICY "Appointments update staff or owner" ON public.appointments FOR UPDATE
  USING (
    customer_profile_id = public.current_profile_id()
    OR public.has_barbershop_role(barbershop_id, ARRAY['admin', 'barber'])
  );

-- Admin write policies for catalog & settings
CREATE POLICY "Admin manage services" ON public.services FOR ALL
  USING (public.has_barbershop_role(barbershop_id, ARRAY['admin']));
CREATE POLICY "Admin manage barbers" ON public.barbers FOR ALL
  USING (public.has_barbershop_role(barbershop_id, ARRAY['admin']));
CREATE POLICY "Staff manage time_blocks" ON public.time_blocks FOR ALL
  USING (public.has_barbershop_role(barbershop_id, ARRAY['admin', 'barber']));
CREATE POLICY "Admin manage settings" ON public.settings FOR ALL
  USING (public.has_barbershop_role(barbershop_id, ARRAY['admin']));
CREATE POLICY "Staff read activity_logs" ON public.activity_logs FOR SELECT
  USING (public.has_barbershop_role(barbershop_id, ARRAY['admin', 'barber']));

-- Privacy-safe Transfer Board View (NEVER exposes original customer's name/phone/email)
CREATE OR REPLACE VIEW public.public_transfer_board AS
SELECT
  t.id AS transfer_id,
  t.appointment_id,
  t.status,
  t.offered_at,
  t.expires_at,
  a.barbershop_id,
  a.barber_id,
  b.display_name AS barber_name,
  a.start_at,
  a.end_at,
  a.total_price_cents,
  a.deposit_cents
FROM public.transfers t
JOIN public.appointments a ON a.id = t.appointment_id
JOIN public.barbers b ON b.id = a.barber_id
WHERE t.status = 'available'
  AND a.status = 'confirmed'
  AND a.start_at > now();
