import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Copy, AlertTriangle } from 'lucide-react';
import type { Appointment } from '@/types/domain';
import { formatBRL, formatDateBR } from '@/config/brand';
import { pixProvider } from '@/features/payments/pixProvider';
import { useVibeStore } from '@/services/vibeStore';
import { Badge, Button, Modal, useToast } from '@/components/ui/primitives';

export function PixCheckoutModal({
  appointment,
  open,
  onClose,
  onConfirmed,
}: {
  appointment: Appointment | null;
  open: boolean;
  onClose: () => void;
  onConfirmed?: () => void;
}) {
  const { state, confirmDemoPayment, expireDemoPayment } = useVibeStore();
  const { toast } = useToast();
  const [remainingSec, setRemainingSec] = useState(600);

  const charge = useMemo(() => {
    if (!appointment) return null;
    return pixProvider.createPixCharge({
      appointmentCode: appointment.appointmentCode,
      amountCents: appointment.depositCents,
      pixKey: state.settings.pixKey,
      receiverName: state.barbershop.name,
    });
  }, [appointment, state.settings.pixKey, state.barbershop.name]);

  useEffect(() => {
    if (!open || !appointment?.expiresAt) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((appointment.expiresAt! - Date.now()) / 1000));
      setRemainingSec(diff);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [open, appointment?.expiresAt]);

  if (!appointment || !charge) return null;

  const barber = state.barbers.find((b) => b.id === appointment.barberId);
  const chairBalance = Math.max(0, appointment.totalPriceCents - appointment.depositCents);
  const min = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const sec = String(remainingSec % 60).padStart(2, '0');

  const handleCopy = () => {
    navigator.clipboard?.writeText(charge.demoCode).then(
      () => toast('Código demonstrativo copiado!', 'success'),
      () => toast('Código pronto para cópia.', 'info')
    );
  };

  const handleConfirm = () => {
    const res = confirmDemoPayment(appointment.id);
    if (res.ok) {
      toast(`Reserva ${appointment.appointmentCode} confirmada com sucesso!`, 'success');
      onClose();
      onConfirmed?.();
    } else {
      toast(res.error || 'Não foi possível confirmar.', 'error');
    }
  };

  const handleExpire = () => {
    const res = expireDemoPayment(appointment.id);
    if (res.ok) {
      toast('Expiração simulada: pré-reserva cancelada e vaga liberada na agenda.', 'info');
      onClose();
    }
  };

  return (
    <Modal open={open} title="Pagamento de Sinal — Modo Demonstração" onClose={onClose}>
      <div className="space-y-4">
        {/* Clear Demo Banner per PRD Section 9.3 */}
        <div className="rounded-xl bg-gold/10 border border-gold/30 p-3 flex items-start gap-2.5 text-xs text-gold-light">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Pagamento Simulado (Ambiente Demo):</strong> este QR Code é ilustrativo e não
            realiza cobrança bancária real. Em produção, a confirmação é validada por webhook do PSP (Asaas / Mercado Pago).
          </span>
        </div>

        <div className="flex items-center justify-between">
          <Badge tone="gold">Código {appointment.appointmentCode}</Badge>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface2 text-gold-light font-mono text-xs font-bold">
            <Clock className="w-3.5 h-3.5" /> {min}:{sec}
          </span>
        </div>

        <div className="rounded-xl bg-deep border border-white/10 p-3.5 space-y-1.5 text-sm">
          <div className="flex justify-between text-ink-muted">
            <span>Data e horário</span>
            <strong className="text-ink">{formatDateBR(appointment.date)} • {appointment.startTime}</strong>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>Barbeiro</span>
            <strong className="text-ink">{barber?.displayName}</strong>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>Total dos serviços</span>
            <span>{formatBRL(appointment.totalPriceCents)}</span>
          </div>
          <div className="flex justify-between text-ink-muted">
            <span>Restante na barbearia</span>
            <span>{formatBRL(chairBalance)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-white/10 text-base font-bold">
            <span>Sinal Pix agora</span>
            <span className="text-confirm font-mono">{formatBRL(appointment.depositCents)}</span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div
            className="bg-white p-3 rounded-2xl shadow-lg"
            dangerouslySetInnerHTML={{ __html: charge.qrSvg }}
          />
          <span className="text-[11px] text-ink-dim mt-2">QR Code demonstrativo • Não escaneie em app bancário</span>
        </div>

        <div className="bg-deep border border-white/10 rounded-xl p-2.5 font-mono text-[11px] text-ink-muted break-all">
          {charge.demoCode}
        </div>

        <div className="space-y-2">
          <Button variant="outline" className="w-full" onClick={handleCopy}>
            <Copy className="w-4 h-4" /> Copiar código demonstrativo
          </Button>
          <Button variant="confirm" className="w-full" onClick={handleConfirm}>
            <CheckCircle2 className="w-4 h-4" /> Simular Pagamento Confirmado
          </Button>
          <Button variant="danger" size="sm" className="w-full" onClick={handleExpire}>
            Simular Expiração (liberar horário)
          </Button>
        </div>
      </div>
    </Modal>
  );
}
