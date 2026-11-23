import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { useVibeStore } from '@/services/vibeStore';
import { formatBRL, formatDateBR, getUpcomingDates } from '@/config/brand';
import {
  calculateServicesTotals,
  computeAvailableSlots,
} from '@/features/availability/engine';
import type { Appointment } from '@/types/domain';
import { Badge, Button, Card, Input, useToast } from '@/components/ui/primitives';
import { PixCheckoutModal } from '@/components/booking/PixCheckoutModal';
import { cn } from '@/lib/utils/cn';

const clientSchema = z.object({
  customerName: z.string().min(2, 'Informe seu nome completo'),
  customerPhone: z
    .string()
    .min(10, 'Informe um telefone/WhatsApp válido com DDD'),
  customerEmail: z.string().email('E-mail inválido').optional().or(z.literal('')),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export function BookingPage() {
  const { state, activeProfile, createBooking } = useVibeStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const activeServices = state.services.filter((s) => s.active);
  const activeBarbers = state.barbers.filter((b) => b.active);
  const dates = useMemo(() => getUpcomingDates(state.settings.maxFutureDays || 14), [state.settings.maxFutureDays]);

  const initialService = searchParams.get('service');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() =>
    initialService && activeServices.some((s) => s.id === initialService)
      ? [initialService]
      : activeServices[0]
        ? [activeServices[0].id]
        : []
  );
  const [selectedBarberId, setSelectedBarberId] = useState<string | 'any'>('any');
  const [selectedDate, setSelectedDate] = useState<string>(dates[0]?.iso || '');
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; barberId: string } | null>(null);
  const [pendingAppt, setPendingAppt] = useState<Appointment | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      customerName: activeProfile.fullName,
      customerPhone: activeProfile.phone,
      customerEmail: activeProfile.email || '',
    },
  });

  useEffect(() => {
    reset({
      customerName: activeProfile.fullName,
      customerPhone: activeProfile.phone,
      customerEmail: activeProfile.email || '',
    });
  }, [activeProfile, reset]);

  const selectedServices = activeServices.filter((s) => selectedServiceIds.includes(s.id));
  const totals = calculateServicesTotals(selectedServices, state.settings);

  const selectedDateObj = dates.find((d) => d.iso === selectedDate) || dates[0];

  const availableSlots = useMemo(() => {
    if (!selectedDateObj) return [];
    return computeAvailableSlots({
      date: selectedDateObj.iso,
      weekday: selectedDateObj.weekday,
      durationMinutes: totals.totalDurationMinutes,
      barbers: activeBarbers,
      selectedBarberId,
      selectedServiceIds,
      appointments: state.appointments,
      timeBlocks: state.timeBlocks,
    });
  }, [
    selectedDateObj,
    totals.totalDurationMinutes,
    activeBarbers,
    selectedBarberId,
    selectedServiceIds,
    state.appointments,
    state.timeBlocks,
  ]);

  const toggleService = (id: string) => {
    setSelectedSlot(null);
    setSelectedServiceIds((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((x) => x !== id)
          : prev
        : [...prev, id]
    );
  };

  const onSubmit = (formValues: ClientFormValues) => {
    if (!selectedSlot) {
      toast('Selecione um horário disponível para continuar.', 'error');
      return;
    }

    const res = createBooking({
      serviceIds: selectedServiceIds,
      barberId: selectedSlot.barberId,
      date: selectedDate,
      startTime: selectedSlot.startTime,
      customerName: formValues.customerName,
      customerPhone: formValues.customerPhone,
      customerEmail: formValues.customerEmail,
    });

    if (!res.ok || !res.data) {
      toast(res.error || 'Erro ao criar reserva.', 'error');
      return;
    }

    setSelectedSlot(null);
    if (res.data.status === 'pending_payment') {
      setPendingAppt(res.data);
    } else {
      toast(`Horário confirmado! Código ${res.data.appointmentCode}`, 'success');
      navigate('/cliente/agendamentos');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6 space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">
            Agendar na {state.barbershop.name}
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Siga os passos abaixo na ordem — leva menos de 1 minuto.
          </p>
        </div>

        {/* Barra de progresso anti-erro */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="rounded-xl px-3 py-2 border border-confirm/40 bg-confirm/10 text-green-300 font-semibold flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 shrink-0" /> 1. Serviço ({selectedServiceIds.length})
          </div>
          <div className="rounded-xl px-3 py-2 border border-confirm/40 bg-confirm/10 text-green-300 font-semibold flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 shrink-0" /> 2. Barbeiro
          </div>
          <div
            className={cn(
              'rounded-xl px-3 py-2 border font-semibold flex items-center gap-1.5',
              selectedSlot
                ? 'border-confirm/40 bg-confirm/10 text-green-300'
                : 'border-gold/45 bg-gold/10 text-gold-light'
            )}
          >
            {selectedSlot ? <Check className="w-3.5 h-3.5 shrink-0" /> : <span>→</span>}{' '}
            3. Horário {selectedSlot ? `(${selectedSlot.startTime})` : '(falta escolher)'}
          </div>
          <div className="rounded-xl px-3 py-2 border border-white/10 bg-surface/60 text-ink-muted font-semibold">
            4. Confirmar Pix
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Steps 1 to 5 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Services */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">1. Escolha o(s) serviço(s)</h2>
              <span className="text-xs text-ink-muted">Pode selecionar mais de um</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeServices.map((srv) => {
                const selected = selectedServiceIds.includes(srv.id);
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => toggleService(srv.id)}
                    className={cn(
                      'text-left p-4 rounded-xl border transition-all flex items-start justify-between gap-3',
                      selected
                        ? 'bg-gold/10 border-gold ring-1 ring-gold'
                        : 'bg-deep/70 border-white/10 hover:border-white/25'
                    )}
                  >
                    <div>
                      <div className="font-semibold text-sm text-ink flex items-center gap-1.5">
                        {selected && <Check className="w-4 h-4 text-gold shrink-0" />}
                        {srv.name}
                      </div>
                      <div className="text-xs text-ink-muted mt-1">
                        {srv.durationMinutes} min • {srv.category}
                      </div>
                    </div>
                    <span className="font-mono text-sm font-bold text-gold-light shrink-0">
                      {formatBRL(srv.priceCents)}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Step 2: Barber */}
          <Card className="space-y-4">
            <h2 className="text-base font-bold text-ink">2. Escolha o profissional</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedBarberId('any');
                  setSelectedSlot(null);
                }}
                className={cn(
                  'text-left p-3.5 rounded-xl border transition-all flex items-center gap-3',
                  selectedBarberId === 'any'
                    ? 'bg-gold/10 border-gold ring-1 ring-gold'
                    : 'bg-deep/70 border-white/10 hover:border-white/25'
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-surface2 text-gold font-bold flex items-center justify-center shrink-0">
                  ★
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink">Qualquer disponível</div>
                  <div className="text-xs text-ink-muted">Mais horários livres</div>
                </div>
              </button>

              {activeBarbers.map((barber) => {
                const selected = selectedBarberId === barber.id;
                return (
                  <button
                    key={barber.id}
                    type="button"
                    onClick={() => {
                      setSelectedBarberId(barber.id);
                      setSelectedSlot(null);
                    }}
                    className={cn(
                      'text-left p-3.5 rounded-xl border transition-all flex items-center gap-3',
                      selected
                        ? 'bg-gold/10 border-gold ring-1 ring-gold'
                        : 'bg-deep/70 border-white/10 hover:border-white/25'
                    )}
                  >
                    <div
                      className="w-10 h-10 rounded-xl text-deep font-extrabold text-sm flex items-center justify-center shrink-0"
                      style={{ backgroundColor: barber.avatarColor }}
                    >
                      {barber.avatarInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink truncate">{barber.displayName}</div>
                      <div className="text-xs text-ink-muted truncate">
                        {barber.specialties.slice(0, 2).join(' • ')}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Step 3: Date */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">3. Escolha a data</h2>
              <span className="text-xs text-gold-light font-semibold">{formatDateBR(selectedDate)}</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {dates.map((d) => {
                const selected = selectedDate === d.iso;
                const count = computeAvailableSlots({
                  date: d.iso,
                  weekday: d.weekday,
                  durationMinutes: totals.totalDurationMinutes,
                  barbers: activeBarbers,
                  selectedBarberId,
                  selectedServiceIds,
                  appointments: state.appointments,
                  timeBlocks: state.timeBlocks,
                }).length;

                return (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => {
                      setSelectedDate(d.iso);
                      setSelectedSlot(null);
                    }}
                    className={cn(
                      'flex-none min-w-[78px] px-3 py-2.5 rounded-xl border flex flex-col items-center gap-0.5 transition-all',
                      selected
                        ? 'bg-gold text-deep border-gold font-bold'
                        : count === 0
                          ? 'bg-deep/40 border-white/5 text-ink-dim'
                          : 'bg-deep/80 border-white/10 text-ink hover:border-white/25'
                    )}
                  >
                    <span className="text-[11px] uppercase opacity-80">{d.dow}</span>
                    <span className="text-lg font-extrabold leading-tight">{d.day}</span>
                    <span className="text-[10px] opacity-80">{count} vagas</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Step 4: Time Slots */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">4. Horários disponíveis</h2>
              <span className="text-xs text-ink-muted inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Duração: {totals.totalDurationMinutes} min
              </span>
            </div>

            {availableSlots.length === 0 ? (
              <div className="rounded-xl bg-deep/70 border border-dashed border-white/15 p-6 text-center space-y-2">
                <p className="text-sm font-semibold text-ink">Nenhuma vaga livre nesta data</p>
                <p className="text-xs text-ink-muted">
                  Tente outro dia, escolha &quot;Qualquer disponível&quot; ou confira o Mural de Repasses e Fila de Espera.
                </p>
                <Button size="sm" variant="info" onClick={() => navigate('/cliente/repasses')}>
                  Ver Repasses &amp; Fila de Espera
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlot?.startTime === slot.startTime;
                  return (
                    <button
                      key={slot.startTime}
                      type="button"
                      onClick={() =>
                        setSelectedSlot({ startTime: slot.startTime, barberId: slot.barberId })
                      }
                      className={cn(
                        'py-2.5 px-2 rounded-xl border font-mono text-sm font-bold transition-all',
                        isSelected
                          ? 'bg-gold text-deep border-gold shadow-md shadow-gold/25'
                          : 'bg-deep/80 text-ink border-white/10 hover:border-gold/50'
                      )}
                    >
                      {slot.startTime}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Step 5: Client Details */}
          <Card className="space-y-4">
            <h2 className="text-base font-bold text-ink">5. Seus dados para confirmação</h2>
            <form id="bookingForm" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5" htmlFor="customerName">
                  Nome completo *
                </label>
                <Input id="customerName" {...register('customerName')} placeholder="Seu nome" />
                {errors.customerName && (
                  <p className="text-xs text-red-400 mt-1">{errors.customerName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5" htmlFor="customerPhone">
                  WhatsApp / Telefone *
                </label>
                <Input id="customerPhone" {...register('customerPhone')} placeholder="(11) 99999-9999" />
                {errors.customerPhone && (
                  <p className="text-xs text-red-400 mt-1">{errors.customerPhone.message}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-ink-muted mb-1.5" htmlFor="customerEmail">
                  E-mail (opcional)
                </label>
                <Input id="customerEmail" type="email" {...register('customerEmail')} placeholder="voce@email.com" />
                {errors.customerEmail && (
                  <p className="text-xs text-red-400 mt-1">{errors.customerEmail.message}</p>
                )}
              </div>
            </form>
          </Card>
        </div>

        {/* Right Sticky Summary */}
        <div className="lg:sticky lg:top-28">
          <Card className="space-y-4 border-gold/25">
            <h3 className="text-lg font-extrabold text-ink">Resumo da Reserva</h3>

            <div className="space-y-2 text-sm">
              {selectedServices.map((s) => (
                <div key={s.id} className="flex justify-between text-ink-muted">
                  <span>{s.name}</span>
                  <span className="font-mono text-ink">{formatBRL(s.priceCents)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-ink-muted">
                <span>Duração total</span>
                <strong className="text-ink">{totals.totalDurationMinutes} min</strong>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>Data</span>
                <strong className="text-ink">{formatDateBR(selectedDate)}</strong>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>Horário</span>
                <strong className="text-gold-light font-mono">
                  {selectedSlot ? selectedSlot.startTime : 'Selecione acima'}
                </strong>
              </div>
              {selectedSlot && (
                <div className="flex justify-between text-ink-muted">
                  <span>Barbeiro</span>
                  <strong className="text-ink">
                    {activeBarbers.find((b) => b.id === selectedSlot.barberId)?.displayName}
                  </strong>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-deep p-3.5 space-y-1.5 text-sm border border-white/10">
              <div className="flex justify-between text-ink-muted">
                <span>Total</span>
                <span className="font-mono">{formatBRL(totals.totalPriceCents)}</span>
              </div>
              <div className="flex justify-between text-ink-muted">
                <span>Restante na cadeira</span>
                <span className="font-mono">{formatBRL(totals.remainingCents)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-base">
                <span>Sinal Pix agora</span>
                <span className="font-mono text-confirm">{formatBRL(totals.depositCents)}</span>
              </div>
            </div>

            <Button
              type="submit"
              form="bookingForm"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!selectedSlot}
            >
              <ShieldCheck className="w-4 h-4" />{' '}
              {selectedSlot ? 'Confirmar e Pagar Sinal Pix' : 'Escolha um horário acima primeiro'}
            </Button>

            <p className="text-[11px] text-ink-dim leading-relaxed">
              {state.settings.cancellationPolicyText}
            </p>
          </Card>
        </div>
      </div>

      <PixCheckoutModal
        appointment={pendingAppt}
        open={Boolean(pendingAppt)}
        onClose={() => setPendingAppt(null)}
        onConfirmed={() => navigate('/cliente/agendamentos')}
      />
    </div>
  );
}
