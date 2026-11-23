import { useState } from 'react';
import { BellPlus, Repeat, ShieldCheck, Zap } from 'lucide-react';
import { useVibeStore } from '@/services/vibeStore';
import { formatBRL, formatDateBR, getUpcomingDates } from '@/config/brand';
import { matchesWaitlistPeriod } from '@/features/availability/engine';
import type { WaitlistPeriod } from '@/types/domain';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  Select,
  useToast,
} from '@/components/ui/primitives';

const PERIOD_LABELS: Record<WaitlistPeriod, string> = {
  morning: 'Manhã (09h – 12h)',
  afternoon: 'Tarde (12h – 18h)',
  evening: 'Noite (18h – 20h)',
  any: 'Qualquer horário',
};

export function TransfersAndWaitlistPage() {
  const { state, activeProfile, claimTransfer, cancelTransfer, joinWaitlist, cancelWaitlist } =
    useVibeStore();
  const { toast } = useToast();

  const dates = getUpcomingDates(14);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [wlServiceId, setWlServiceId] = useState(state.services[0]?.id || '');
  const [wlBarberId, setWlBarberId] = useState<string | 'any'>('any');
  const [wlDate, setWlDate] = useState(dates[0]?.iso || '');
  const [wlPeriod, setWlPeriod] = useState<WaitlistPeriod>('afternoon');

  const activeTransfers = state.transfers.filter((t) => t.status === 'available');
  const activeWaitlist = state.waitlist.filter((w) => w.status === 'active');

  const handleClaim = (transferId: string) => {
    const res = claimTransfer(transferId);
    if (res.ok && res.data) {
      toast(
        `Repasse concluído! Nova reserva ${res.data.appointmentCode} confirmada e sinal anterior estornado.`,
        'success'
      );
    } else {
      toast(res.error || 'Não foi possível assumir esta vaga.', 'error');
    }
  };

  const handleJoinWaitlist = () => {
    const res = joinWaitlist({
      serviceId: wlServiceId,
      barberId: wlBarberId,
      preferredDate: wlDate,
      preferredPeriod: wlPeriod,
    });
    if (res.ok) {
      toast('Interesse registrado na Fila de Espera!', 'success');
      setWaitlistOpen(false);
    } else {
      toast(res.error || 'Erro ao entrar na fila.', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-10">
      {/* Transfer Board (Privacy-safe: NEVER shows original customer personal data) */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Badge tone="info">
              <Zap className="w-3.5 h-3.5" /> Privacidade Protegida (LGPD)
            </Badge>
            <h1 className="text-2xl font-extrabold text-ink mt-2">Mural de Repasses</h1>
            <p className="text-sm text-ink-muted">
              Horários liberados por clientes com imprevisto. Assuma a vaga pagando apenas o sinal via Pix — nenhum dado pessoal do titular original é exibido.
            </p>
          </div>
        </div>

        {activeTransfers.length === 0 ? (
          <EmptyState
            title="Nenhuma vaga em repasse no momento"
            description="Entre na Fila de Espera abaixo para ser notificado assim que alguém liberar um horário."
            action={
              <Button variant="primary" onClick={() => setWaitlistOpen(true)}>
                Entrar na Fila de Espera
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTransfers.map((trf) => {
              const appt = state.appointments.find((a) => a.id === trf.appointmentId);
              if (!appt) return null;
              const barber = state.barbers.find((b) => b.id === appt.barberId);
              const isOwner = trf.originalCustomerId === activeProfile.id;

              return (
                <Card key={trf.id} className="border-info/35 bg-info/[0.05] space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-base font-extrabold text-ink">
                        {formatDateBR(appt.date)} •{' '}
                        <span className="font-mono text-sky-300">
                          {appt.startTime}–{appt.endTime}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5">
                        Profissional: <strong className="text-ink">{barber?.displayName}</strong>
                      </p>
                    </div>
                    <Badge tone="info">
                      <Repeat className="w-3 h-3" /> Vaga Disponível
                    </Badge>
                  </div>

                  <div className="text-sm text-ink">
                    {appt.items.map((i) => i.serviceNameSnapshot).join(' + ')}
                  </div>

                  {trf.note && (
                    <p className="text-xs text-ink-muted italic">&quot;{trf.note}&quot;</p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                    <span className="text-ink-muted">
                      Sinal Pix: <strong className="font-mono text-confirm">{formatBRL(appt.depositCents)}</strong>
                    </span>
                    {isOwner ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          cancelTransfer(trf.id);
                          toast('Seu repasse foi cancelado.', 'info');
                        }}
                      >
                        Cancelar meu repasse
                      </Button>
                    ) : (
                      <Button size="sm" variant="info" onClick={() => handleClaim(trf.id)}>
                        <ShieldCheck className="w-3.5 h-3.5" /> Assumir Vaga
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Waitlist */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-extrabold text-ink">Fila de Espera ({activeWaitlist.length})</h2>
            <p className="text-sm text-ink-muted">
              Registre sua preferência de data e turno. Quando surgir uma vaga compatível no repasse, destacamos aqui automaticamente.
            </p>
          </div>
          <Button variant="primary" onClick={() => setWaitlistOpen(true)}>
            <BellPlus className="w-4 h-4" /> Entrar na Fila
          </Button>
        </div>

        {activeWaitlist.length === 0 ? (
          <EmptyState
            title="Fila de espera vazia"
            description="Cadastre seu interesse para um dia ou turno concorrido."
          />
        ) : (
          <div className="space-y-3">
            {activeWaitlist.map((entry) => {
              const service = state.services.find((s) => s.id === entry.serviceId);
              const barber =
                entry.barberId === 'any'
                  ? 'Qualquer profissional'
                  : state.barbers.find((b) => b.id === entry.barberId)?.displayName;

              const hasCompatible = activeTransfers.some((trf) => {
                const appt = state.appointments.find((a) => a.id === trf.appointmentId);
                if (!appt) return false;
                const dateOk = appt.date === entry.preferredDate;
                const periodOk = matchesWaitlistPeriod(appt.startTime, entry.preferredPeriod);
                const barberOk = entry.barberId === 'any' || appt.barberId === entry.barberId;
                return dateOk && periodOk && barberOk;
              });

              const isMine = entry.customerProfileId === activeProfile.id;

              return (
                <Card key={entry.id} className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="font-bold text-sm text-ink">
                      {formatDateBR(entry.preferredDate)} • {PERIOD_LABELS[entry.preferredPeriod]}
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Serviço: {service?.name} • Profissional: {barber}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasCompatible ? (
                      <Badge tone="confirm">Vaga compatível no mural!</Badge>
                    ) : (
                      <Badge tone="muted">Aguardando vaga</Badge>
                    )}
                    {isMine && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          cancelWaitlist(entry.id);
                          toast('Você saiu da fila de espera.', 'info');
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Modal open={waitlistOpen} title="Entrar na Fila de Espera" onClose={() => setWaitlistOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1.5">Serviço</label>
            <Select value={wlServiceId} onChange={(e) => setWlServiceId(e.target.value)}>
              {state.services.filter((s) => s.active).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1.5">Profissional</label>
            <Select value={wlBarberId} onChange={(e) => setWlBarberId(e.target.value)}>
              <option value="any">Qualquer profissional disponível</option>
              {state.barbers.filter((b) => b.active).map((b) => (
                <option key={b.id} value={b.id}>{b.displayName}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1.5">Data desejada</label>
            <Select value={wlDate} onChange={(e) => setWlDate(e.target.value)}>
              {dates.map((d) => (
                <option key={d.iso} value={d.iso}>{d.fullLabel}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1.5">Turno</label>
            <Select value={wlPeriod} onChange={(e) => setWlPeriod(e.target.value as WaitlistPeriod)}>
              <option value="morning">Manhã (09h – 12h)</option>
              <option value="afternoon">Tarde (12h – 18h)</option>
              <option value="evening">Noite (18h – 20h)</option>
              <option value="any">Qualquer horário</option>
            </Select>
          </div>
          <Button variant="primary" className="w-full" onClick={handleJoinWaitlist}>
            Confirmar Entrada na Fila
          </Button>
        </div>
      </Modal>
    </div>
  );
}
