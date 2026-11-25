import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, CalendarPlus, Repeat, Search, XCircle } from 'lucide-react';
import { formatCpf, maskClientName, useVibeStore } from '@/services/vibeStore';
import { formatBRL, formatDateBR } from '@/config/brand';
import type { Appointment, AppointmentStatus } from '@/types/domain';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Select,
  useToast,
} from '@/components/ui/primitives';
import { PixCheckoutModal } from '@/components/booking/PixCheckoutModal';

function statusBadge(status: AppointmentStatus, isListedForTransfer: boolean) {
  if (isListedForTransfer && status === 'confirmed') {
    return <Badge tone="info">Em Repasse no Mural</Badge>;
  }
  const map: Record<AppointmentStatus, { label: string; tone: 'gold' | 'confirm' | 'info' | 'alert' | 'muted' }> = {
    pending_payment: { label: 'Aguardando Sinal Pix', tone: 'gold' },
    confirmed: { label: 'Confirmado • Sinal Pago', tone: 'confirm' },
    in_progress: { label: 'Em Atendimento', tone: 'info' },
    completed: { label: 'Concluído', tone: 'muted' },
    cancelled: { label: 'Cancelado', tone: 'alert' },
    expired: { label: 'Expirado', tone: 'muted' },
    no_show: { label: 'No-show (Falta)', tone: 'alert' },
    transferred: { label: 'Repassado', tone: 'info' },
  };
  const cfg = map[status];
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
}

export function ClientBookingsPage() {
  const {
    state,
    activeProfile,
    identifyClientByCpf,
    cancelAppointment,
    offerTransfer,
    cancelTransfer,
    proposeSwap,
    respondSwap,
  } = useVibeStore();
  const { toast } = useToast();

  const [cpfSearch, setCpfSearch] = useState(activeProfile.cpf ? formatCpf(activeProfile.cpf) : '');
  const [pixAppt, setPixAppt] = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [transferTarget, setTransferTarget] = useState<Appointment | null>(null);
  const [transferNote, setTransferNote] = useState('');
  const [swapFromId, setSwapFromId] = useState<string | null>(null);
  const [swapToId, setSwapToId] = useState<string>('');
  const [swapNote, setSwapNote] = useState('');

  const myAppointments = state.appointments
    .filter((a) => a.customerProfileId === activeProfile.id)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

  const receivedSwaps = state.swaps.filter(
    (s) => s.status === 'pending' && s.targetCustomerId === activeProfile.id
  );

  const otherConfirmedAppts = state.appointments.filter(
    (a) => a.status === 'confirmed' && a.customerProfileId !== activeProfile.id
  );

  const handleConfirmCancel = () => {
    if (!cancelTarget) return;
    const res = cancelAppointment(cancelTarget.id, cancelReason);
    if (res.ok) {
      toast(`Reserva ${cancelTarget.appointmentCode} cancelada e horário liberado.`, 'info');
      setCancelTarget(null);
      setCancelReason('');
    } else {
      toast(res.error || 'Erro ao cancelar.', 'error');
    }
  };

  const handleConfirmTransfer = () => {
    if (!transferTarget) return;
    const res = offerTransfer(transferTarget.id, transferNote);
    if (res.ok) {
      toast('Vaga publicada no Mural de Repasses (sem expor seus dados pessoais).', 'success');
      setTransferTarget(null);
      setTransferNote('');
    } else {
      toast(res.error || 'Erro ao disponibilizar repasse.', 'error');
    }
  };

  const handleSubmitSwap = () => {
    if (!swapFromId || !swapToId) {
      toast('Selecione um horário para propor a troca.', 'error');
      return;
    }
    const res = proposeSwap(swapFromId, swapToId, swapNote);
    if (res.ok) {
      toast('Proposta de troca enviada! Alterne o perfil no topo (Modo Demo) para aceitar.', 'success');
      setSwapFromId(null);
      setSwapNote('');
    } else {
      toast(res.error || 'Erro ao propor troca.', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Meus Horários</h1>
          <p className="text-sm text-ink-muted">
            Consulte suas reservas usando apenas seu CPF — sem precisar de senha.
          </p>
        </div>
        <Link to="/agendar">
          <Button variant="primary">
            <CalendarPlus className="w-4 h-4" /> Novo Agendamento
          </Button>
        </Link>
      </div>

      {/* Zero-login CPF lookup bar */}
      <Card className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex-1 max-w-sm">
          <label htmlFor="lookupCpfInput" className="block text-xs font-semibold text-ink-muted mb-1">
            Consultar por CPF (ex: 111.111.111-11 ou 222.222.222-22)
          </label>
          <Input
            id="lookupCpfInput"
            inputMode="numeric"
            value={cpfSearch}
            onChange={(e) => setCpfSearch(formatCpf(e.target.value))}
            placeholder="000.000.000-00"
            maxLength={14}
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="secondary"
            onClick={() => {
              const r = identifyClientByCpf(cpfSearch);
              if (r.ok && r.data) {
                toast(`Horários de ${r.data.maskedName} carregados!`, 'success');
              } else {
                toast(r.error || 'CPF não encontrado.', 'error');
              }
            }}
          >
            <Search className="w-4 h-4" /> Buscar reservas
          </Button>
          <span className="text-xs text-ink-muted">
            Mostrando: <strong className="text-gold-light">{maskClientName(activeProfile.fullName)}</strong>
          </span>
        </div>
      </Card>

      {/* Received Swaps */}
      {receivedSwaps.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gold-light">
            Propostas de Troca Recebidas ({receivedSwaps.length})
          </h2>
          {receivedSwaps.map((sw) => {
            const apptA = state.appointments.find((a) => a.id === sw.appointmentAId);
            const apptB = state.appointments.find((a) => a.id === sw.appointmentBId);
            if (!apptA || !apptB) return null;
            const barberA = state.barbers.find((b) => b.id === apptA.barberId);
            return (
              <Card key={sw.id} className="border-gold/40 bg-gold/[0.06] space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-bold text-ink">
                      Proposta para trocar seu horário ({formatDateBR(apptB.date)} às {apptB.startTime})
                    </div>
                    <p className="text-sm text-ink-muted mt-0.5">
                      Novo horário proposto: <strong className="text-ink">{formatDateBR(apptA.date)} às {apptA.startTime}</strong> com {barberA?.displayName}
                    </p>
                    <p className="text-xs text-ink mt-1 italic">&quot;{sw.note}&quot;</p>
                  </div>
                  <Badge tone="gold">Troca pendente</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="confirm"
                    onClick={() => {
                      const r = respondSwap(sw.id, true);
                      toast(r.ok ? 'Troca concluída mantendo os sinais pagos!' : r.error || 'Erro', r.ok ? 'success' : 'error');
                    }}
                  >
                    Aceitar Troca (sinal mantido)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      respondSwap(sw.id, false);
                      toast('Proposta recusada.', 'info');
                    }}
                  >
                    Recusar
                  </Button>
                </div>
              </Card>
            );
          })}
        </section>
      )}

      {/* Bookings List */}
      <section className="space-y-3">
        {myAppointments.length === 0 ? (
          <EmptyState
            title="Nenhuma reserva encontrada"
            description="Reserve seu horário em poucos cliques com sinal via Pix e garanta sua cadeira."
            action={
              <Link to="/agendar">
                <Button variant="primary">Agendar agora</Button>
              </Link>
            }
          />
        ) : (
          myAppointments.map((appt) => {
            const barber = state.barbers.find((b) => b.id === appt.barberId);
            const activeTransfer = state.transfers.find(
              (t) => t.appointmentId === appt.id && t.status === 'available'
            );
            const remaining = Math.max(0, appt.totalPriceCents - appt.depositCents);

            return (
              <Card key={appt.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-gold">{appt.appointmentCode}</span>
                      <span className="font-bold text-ink">
                        {appt.items.map((i) => i.serviceNameSnapshot).join(' + ')}
                      </span>
                    </div>
                    <p className="text-sm text-ink-muted mt-0.5">
                      {formatDateBR(appt.date)} •{' '}
                      <strong className="font-mono text-ink">
                        {appt.startTime}–{appt.endTime}
                      </strong>{' '}
                      • Barbeiro: <strong className="text-ink">{barber?.displayName}</strong>
                    </p>
                  </div>
                  {statusBadge(appt.status, Boolean(activeTransfer))}
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-ink-muted">
                  <span>Total: <strong className="text-ink font-mono">{formatBRL(appt.totalPriceCents)}</strong></span>
                  <span>Sinal Pix: <strong className="text-confirm font-mono">{formatBRL(appt.depositCents)}</strong></span>
                  <span>Restante na cadeira: <strong className="text-ink font-mono">{formatBRL(remaining)}</strong></span>
                </div>

                {appt.status === 'pending_payment' && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
                    <Button size="sm" variant="primary" onClick={() => setPixAppt(appt)}>
                      Pagar Sinal Pix (Demo)
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setCancelTarget(appt)}>
                      Cancelar pré-reserva
                    </Button>
                  </div>
                )}

                {appt.status === 'confirmed' && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
                    {activeTransfer ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          cancelTransfer(activeTransfer.id);
                          toast('Vaga removida do mural de repasse.', 'info');
                        }}
                      >
                        Retirar do Repasse
                      </Button>
                    ) : (
                      state.settings.allowTransfers && (
                        <Button size="sm" variant="info" onClick={() => setTransferTarget(appt)}>
                          <Repeat className="w-3.5 h-3.5" /> Disponibilizar para Repasse
                        </Button>
                      )
                    )}

                    {state.settings.allowSwaps && otherConfirmedAppts.length > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSwapFromId(appt.id);
                          setSwapToId(otherConfirmedAppts[0].id);
                        }}
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" /> Propor Troca
                      </Button>
                    )}

                    <Button size="sm" variant="danger" onClick={() => setCancelTarget(appt)}>
                      <XCircle className="w-3.5 h-3.5" /> Cancelar
                    </Button>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </section>

      {/* Pix Modal */}
      <PixCheckoutModal appointment={pixAppt} open={Boolean(pixAppt)} onClose={() => setPixAppt(null)} />

      {/* Cancel Modal */}
      <Modal
        open={Boolean(cancelTarget)}
        title="Cancelar Reserva"
        onClose={() => setCancelTarget(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            {state.settings.cancellationPolicyText}
          </p>
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1.5">
              Motivo do cancelamento (opcional)
            </label>
            <Input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex: Imprevisto pessoal"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Voltar</Button>
            <Button variant="danger" onClick={handleConfirmCancel}>Confirmar Cancelamento</Button>
          </div>
        </div>
      </Modal>

      {/* Offer Transfer Modal */}
      <Modal
        open={Boolean(transferTarget)}
        title="Disponibilizar para Repasse"
        onClose={() => setTransferTarget(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Sua vaga aparecerá no <strong>Mural de Repasses</strong> de forma anônima (seu nome e
            telefone nunca são expostos). Quando outro cliente assumir o horário, seu sinal é estornado.
          </p>
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1.5">
              Observação opcional
            </label>
            <Input
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              placeholder="Ex: Horário excelente de fim de tarde"
            />
          </div>
          <Button variant="info" className="w-full" onClick={handleConfirmTransfer}>
            Publicar no Mural de Repasses
          </Button>
        </div>
      </Modal>

      {/* Propose Swap Modal */}
      <Modal
        open={Boolean(swapFromId)}
        title="Propor Troca de Horário"
        onClose={() => setSwapFromId(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Selecione uma vaga elegível para propor troca. Se o outro cliente aceitar, ambos os
            horários são atualizados atomicamente mantendo os sinais pagos.
          </p>
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1.5">
              Horário desejado
            </label>
            <Select value={swapToId} onChange={(e) => setSwapToId(e.target.value)}>
              {otherConfirmedAppts.map((a) => {
                const b = state.barbers.find((x) => x.id === a.barberId);
                return (
                  <option key={a.id} value={a.id}>
                    {formatDateBR(a.date)} às {a.startTime} — {b?.displayName} (Vaga {a.appointmentCode})
                  </option>
                );
              })}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1.5">
              Mensagem para o outro cliente
            </label>
            <Input
              value={swapNote}
              onChange={(e) => setSwapNote(e.target.value)}
              placeholder="Ex: Consegue trocar comigo? Preciso cortar mais tarde."
            />
          </div>
          <Button variant="primary" className="w-full" onClick={handleSubmitSwap}>
            Enviar Proposta de Troca
          </Button>
        </div>
      </Modal>
    </div>
  );
}
