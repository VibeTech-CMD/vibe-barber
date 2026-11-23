import { useState } from 'react';
import { Calendar, CheckCircle2, Lock, UserX } from 'lucide-react';
import { useVibeStore } from '@/services/vibeStore';
import { formatBRL, formatDateBR, getUpcomingDates } from '@/config/brand';
import { calculateFinancialSummary } from '@/features/availability/engine';
import { Badge, Button, Card, EmptyState, Input, Select, useToast } from '@/components/ui/primitives';

export function BarberDashboardPage() {
  const { state, activeProfile, updateAppointmentStatus, addTimeBlock, removeTimeBlock } =
    useVibeStore();
  const { toast } = useToast();

  const dates = getUpcomingDates(14);
  const myBarberId = activeProfile.barberId || state.barbers[0]?.id || '';
  const [selectedDate, setSelectedDate] = useState(dates[0]?.iso || '');
  const [blockStart, setBlockStart] = useState('12:00');
  const [blockEnd, setBlockEnd] = useState('13:00');
  const [blockReason, setBlockReason] = useState('Almoço / Intervalo');

  const barber = state.barbers.find((b) => b.id === myBarberId);
  const myAppointments = state.appointments.filter((a) => a.barberId === myBarberId);
  const dayAppointments = myAppointments
    .filter((a) => a.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const dayBlocks = state.timeBlocks.filter(
    (b) => b.barberId === myBarberId && b.date === selectedDate
  );

  const summary = calculateFinancialSummary(dayAppointments, state.transfers);

  const handleAddBlock = () => {
    const res = addTimeBlock({
      barberId: myBarberId,
      date: selectedDate,
      startTime: blockStart,
      endTime: blockEnd,
      reason: blockReason || 'Bloqueio',
    });
    if (res.ok) {
      toast('Horário bloqueado na sua agenda.', 'info');
    } else {
      toast(res.error || 'Erro ao bloquear.', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Badge tone="info">Painel do Barbeiro</Badge>
          <h1 className="text-2xl font-extrabold text-ink mt-1">
            Agenda de {barber?.displayName}
          </h1>
        </div>
        <div className="w-56">
          <Select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
            {dates.map((d) => (
              <option key={d.iso} value={d.iso}>{d.fullLabel}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Individual KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <div className="text-xs text-ink-muted">Confirmados</div>
          <div className="text-2xl font-extrabold font-mono text-ink mt-1">{summary.confirmedCount}</div>
        </Card>
        <Card>
          <div className="text-xs text-ink-muted">Concluídos</div>
          <div className="text-2xl font-extrabold font-mono text-confirm mt-1">{summary.completedCount}</div>
        </Card>
        <Card>
          <div className="text-xs text-ink-muted">Sinais Garantidos</div>
          <div className="text-2xl font-extrabold font-mono text-gold-light mt-1">{formatBRL(summary.depositsReceivedCents)}</div>
        </Card>
        <Card>
          <div className="text-xs text-ink-muted">A Receber na Cadeira</div>
          <div className="text-2xl font-extrabold font-mono text-ink mt-1">{formatBRL(summary.chairRemainingCents)}</div>
        </Card>
      </div>

      {/* Day Appointments */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-ink flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gold" /> Atendimentos em {formatDateBR(selectedDate)}
        </h2>
        {dayAppointments.length === 0 ? (
          <EmptyState
            title="Sem agendamentos para esta data"
            description="Quando clientes reservarem horários com você, eles aparecerão aqui em tempo real."
          />
        ) : (
          dayAppointments.map((appt) => (
            <Card key={appt.id} className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-extrabold text-gold-light">
                    {appt.startTime}–{appt.endTime}
                  </span>
                  <strong className="text-ink">{appt.customerName}</strong>
                  <Badge tone={appt.status === 'completed' ? 'confirm' : appt.status === 'no_show' ? 'alert' : 'gold'}>
                    {appt.status}
                  </Badge>
                </div>
                <p className="text-xs text-ink-muted mt-1">
                  {appt.items.map((i) => i.serviceNameSnapshot).join(' + ')} • Tel: {appt.customerPhone} •
                  Total: {formatBRL(appt.totalPriceCents)} (Sinal: {formatBRL(appt.depositCents)})
                </p>
              </div>
              {appt.status === 'confirmed' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="confirm"
                    onClick={() => {
                      updateAppointmentStatus(appt.id, 'completed');
                      toast('Atendimento concluído!', 'success');
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Concluir
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      updateAppointmentStatus(appt.id, 'no_show');
                      toast('Falta (No-show) registrada.', 'error');
                    }}
                  >
                    <UserX className="w-3.5 h-3.5" /> No-show
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </section>

      {/* Quick Time Block */}
      <Card className="space-y-4">
        <h3 className="text-base font-bold text-ink flex items-center gap-2">
          <Lock className="w-4 h-4 text-gold" /> Bloquear Horário ({formatDateBR(selectedDate)})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input type="time" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} />
          <Input type="time" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} />
          <Input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Motivo" />
          <Button variant="secondary" onClick={handleAddBlock}>Bloquear</Button>
        </div>
        {dayBlocks.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            {dayBlocks.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-xs bg-deep px-3 py-2 rounded-xl">
                <span>
                  <strong className="font-mono text-gold">{b.startTime}–{b.endTime}</strong> • {b.reason}
                </span>
                <Button size="sm" variant="ghost" onClick={() => removeTimeBlock(b.id)}>
                  Remover
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
