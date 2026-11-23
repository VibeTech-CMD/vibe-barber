import { describe, expect, it } from 'vitest';
import {
  calculateFinancialSummary,
  calculateServicesTotals,
  computeAvailableSlots,
  hasConflict,
  isAppointmentBlocking,
  matchesWaitlistPeriod,
} from '@/features/availability/engine';
import { createSeedState } from '@/services/vibeStore';

describe('Vibe Barber — Motor de Disponibilidade, Sinal e Financeiro', () => {
  it('calcula duração total, preço, sinal fixo e saldo na cadeira em centavos', () => {
    const seed = createSeedState();
    const corte = seed.services[0]; // 45 min, R$ 50,00
    const barba = seed.services[2]; // 30 min, R$ 35,00

    const totals = calculateServicesTotals([corte, barba], seed.settings);
    expect(totals.totalDurationMinutes).toBe(75);
    expect(totals.totalPriceCents).toBe(8500);
    expect(totals.depositCents).toBe(1000);
    expect(totals.remainingCents).toBe(7500);
  });

  it('impede conflito de reservas simultâneas e respeita bloqueios manuais', () => {
    const seed = createSeedState();
    const date = seed.appointments[0].date; // hoje, apt_101: 10:00–11:00 com brb_carlos

    // Conflito direto com reserva existente (10:00–11:00)
    expect(
      hasConflict({
        barberId: 'brb_carlos',
        date,
        startTime: '10:30',
        endTime: '11:15',
        appointments: seed.appointments,
        timeBlocks: seed.timeBlocks,
      })
    ).toBe(true);

    // Conflito com bloqueio manual (13:00–14:00)
    expect(
      hasConflict({
        barberId: 'brb_carlos',
        date,
        startTime: '13:00',
        endTime: '13:45',
        appointments: seed.appointments,
        timeBlocks: seed.timeBlocks,
      })
    ).toBe(true);

    // Horário livre (09:00–09:45)
    expect(
      hasConflict({
        barberId: 'brb_carlos',
        date,
        startTime: '09:00',
        endTime: '09:45',
        appointments: seed.appointments,
        timeBlocks: seed.timeBlocks,
      })
    ).toBe(false);
  });

  it('libera vaga automaticamente quando pré-reserva pendente expira', () => {
    const seed = createSeedState();
    const expiredPending = {
      ...seed.appointments[0],
      status: 'pending_payment' as const,
      expiresAt: Date.now() - 5000,
    };
    expect(isAppointmentBlocking(expiredPending, Date.now())).toBe(false);

    const activePending = {
      ...seed.appointments[0],
      status: 'pending_payment' as const,
      expiresAt: Date.now() + 60_000,
    };
    expect(isAppointmentBlocking(activePending, Date.now())).toBe(true);
  });

  it('calcula slots disponíveis respeitando intervalo de almoço (12:00–13:00)', () => {
    const seed = createSeedState();
    const slots = computeAvailableSlots({
      date: '2026-12-01',
      weekday: 2, // terça-feira ativa
      durationMinutes: 45,
      barbers: seed.barbers,
      selectedBarberId: 'brb_carlos',
      selectedServiceIds: ['srv_1'],
      appointments: [],
      timeBlocks: [],
    });

    const times = slots.map((s) => s.startTime);
    expect(times).toContain('09:00');
    expect(times).not.toContain('12:00');
    expect(times).not.toContain('12:30');
    expect(times).toContain('13:00');
  });

  it('calcula financeiro sem duplicar sinal como receita extra', () => {
    const seed = createSeedState();
    const completed = {
      ...seed.appointments[0],
      status: 'completed' as const,
      totalPriceCents: 7500,
      depositCents: 1000,
    };
    const noShow = {
      ...seed.appointments[1],
      status: 'no_show' as const,
      totalPriceCents: 5000,
      depositCents: 1000,
    };

    const fin = calculateFinancialSummary([completed, noShow], []);
    // Realizada = R$ 75,00 (concluído) + R$ 10,00 (sinal retido do no-show) = R$ 85,00 (8500 cents)
    expect(fin.realizedRevenueCents).toBe(8500);
    expect(fin.retainedNoShowCents).toBe(1000);
    expect(fin.completedCount).toBe(1);
    expect(fin.noShowCount).toBe(1);
  });

  it('identifica compatibilidade de turno na fila de espera', () => {
    expect(matchesWaitlistPeriod('10:00', 'morning')).toBe(true);
    expect(matchesWaitlistPeriod('15:00', 'afternoon')).toBe(true);
    expect(matchesWaitlistPeriod('18:30', 'evening')).toBe(true);
    expect(matchesWaitlistPeriod('10:00', 'afternoon')).toBe(false);
  });
});
