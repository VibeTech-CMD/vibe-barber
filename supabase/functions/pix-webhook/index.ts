// ============================================================================
// Vibe Barber — Supabase Edge Function: Pix PSP Webhook Handler (Asaas / MP)
// Validates webhook signature, enforces idempotency, and confirms appointment.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const webhookSecret = Deno.env.get('PIX_WEBHOOK_SECRET');
  const providedSecret = req.headers.get('x-webhook-secret');
  if (webhookSecret && providedSecret !== webhookSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await req.json();
    const { external_id, status } = body as { external_id?: string; status?: string };

    if (!external_id || !status) {
      return new Response(JSON.stringify({ error: 'Missing external_id or status' }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: payment, error: findErr } = await supabase
      .from('payments')
      .select('id, appointment_id, status')
      .eq('external_id', external_id)
      .single();

    if (findErr || !payment) {
      return new Response(JSON.stringify({ error: 'Payment not found' }), { status: 404 });
    }

    // Idempotency: ignore if already processed
    if (payment.status === 'paid' && status === 'paid') {
      return new Response(JSON.stringify({ ok: true, idempotent: true }), { status: 200 });
    }

    await supabase
      .from('payments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', payment.id);

    if (status === 'paid') {
      await supabase
        .from('appointments')
        .update({ status: 'confirmed', expires_at: null, updated_at: new Date().toISOString() })
        .eq('id', payment.appointment_id)
        .eq('status', 'pending_payment');
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
