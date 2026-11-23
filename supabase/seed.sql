-- ============================================================================
-- Vibe Barber — Seed Data (Demo Barbershop, 3 Barbers, 6 Services)
-- ============================================================================

INSERT INTO public.barbershops (id, name, slug, description, phone, email, whatsapp, instagram, address, timezone)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Vibe Barber',
  'vibe-barber',
  'Barbearia contemporânea com agendamento inteligente, sinal via Pix e atendimento pontual.',
  '(11) 99450-1020',
  'contato@vibebarber.com.br',
  '5511994501020',
  '@vibebarber.oficial',
  'Av. Paulista, 1420 — Bela Vista, São Paulo - SP',
  'America/Sao_Paulo'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.barbers (id, barbershop_id, display_name, description, specialties, active)
VALUES
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'Carlos "Navalha"', 'Especialista em degradê navalhado e acabamento clássico com 9 anos de experiência.', ARRAY['Degradê', 'Navalhado', 'Barba'], true),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'Diego Fade', 'Referência em cortes modernos, freestyle e visagismo masculino.', ARRAY['Fade', 'Freestyle', 'Platinado'], true),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'Thiago Classic', 'Domínio de tesoura, corte executivo e ritual de toalha quente.', ARRAY['Tesoura', 'Social', 'Barboterapia'], true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.services (id, barbershop_id, name, description, category, duration_minutes, price_cents, buffer_minutes, deposit_cents, active)
VALUES
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', 'Corte Degradê / Fade', 'Corte personalizado com acabamento na navalha, lavagem e finalização.', 'Cabelo', 45, 5000, 0, 1000, true),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111111', 'Corte Social na Tesoura', 'Corte clássico executado na tesoura com finalização matte.', 'Cabelo', 45, 4500, 0, 1000, true),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111111', 'Barboterapia Navalhada', 'Alinhamento de barba com toalha quente, espuma premium e óleo hidratante.', 'Barba', 30, 3500, 0, 1000, true),
  ('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111111', 'Combo Vibe (Corte + Barba)', 'Experiência completa com corte, barboterapia e sobrancelha.', 'Combos', 60, 7500, 0, 1500, true),
  ('33333333-3333-3333-3333-333333333305', '11111111-1111-1111-1111-111111111111', 'Sobrancelha na Navalha', 'Limpeza e alinhamento natural mantendo o formato masculino.', 'Acabamento', 15, 2000, 0, 500, true),
  ('33333333-3333-3333-3333-333333333306', '11111111-1111-1111-1111-111111111111', 'Pezinho & Acabamento', 'Manutenção rápida do contorno e nuca entre cortes.', 'Acabamento', 15, 2000, 0, 500, true)
ON CONFLICT (id) DO NOTHING;
