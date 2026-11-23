import type {
  Appointment,
  Barber,
  Service,
  ShopSettings,
  TimeBlock,
  TransferListing,
  WaitlistPeriod,
} from '@/types/domain';
import { minutesToTime, timeToMinutes } from '@/config/brand';

export interface ComputedSlot {
  startTime: string;
  endTime: string;
  barberId: string;
  available: boolean;
  reason?: 'occupied' | 'blocked' | 'break' | 'outside_hours';
}

export function calculateServicesTotals(
  selectedServices: Service[],
  settings: ShopSettings
) {
  const totalDurationMinutes = selectedServices.reduce(
    (acc, s) => acc + s.durationMinutes + s.bufferMinutes,
    0
  );
  const totalPriceCents = selectedServices.reduce((acc, s) => acc + s.priceCents, 0);

  let depositCents = 0;
  if (settings.requireDeposit && totalPriceCents > 0) {
    if (settings.depositMode === 'per_service') {
      depositCents = selectedServices.reduce((acc, s) => acc + s.depositCents, 0);
    } else {
      depositCents = settings.fixedDepositCents;
    }
    depositCents = Math.min(depositCents, totalPriceCents);
  }

  return {
    totalDurationMinutes,
    totalPriceCents,
    depositCents,
    remainingCents: Math.max(0, totalPriceCents - depositCents),
  };
}

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function isAppointmentBlocking(appt: Appointment, nowMs = Date.now()): boolean {
  if (appt.status === 'confirmed' || appt.status === 'in_progress') return true;
  if (appt.status === 'pending_payment') {
    if (!appt.expiresAt) return true;
    return appt.expiresAt > nowMs;
  }
  return false;
}

export function hasConflict(params: {
  barberId: string;
  date: string;
  startTime: string;
  endTime: string;
  appointments: Appointment[];
  timeBlocks: TimeBlock[];
  ignoreAppointmentId?: string;
  nowMs?: number;
}): boolean {
  const { barberId, date, startTime, endTime, appointments, timeBlocks, ignoreAppointmentId, nowMs } = params;
  const reqStart = timeToMinutes(startTime);
  const reqEnd = timeToMinutes(endTime);

  const blockConflict = timeBlocks.some(
    (blk) =>
      blk.barberId === barberId &&
      blk.date === date &&
      rangesOverlap(reqStart, reqEnd, timeToMinutes(blk.startTime), timeToMinutes(blk.endTime))
  );
  if (blockConflict) return true;

  const apptConflict = appointments.some(
    (appt) =>
      appt.id !== ignoreAppointmentId &&
      appt.barberId === barberId &&
      appt.date === date &&
      isAppointmentBlocking(appt, nowMs) &&
      rangesOverlap(reqStart, reqEnd, timeToMinutes(appt.startTime), timeToMinutes(appt.endTime))
  );
  return apptConflict;
}

export function computeAvailableSlots(params: {
  date: string;
  weekday: number;
  durationMinutes: number;
  barbers: Barber[];
  selectedBarberId: string | 'any';
  selectedServiceIds: string[];
  appointments: Appointment[];
  timeBlocks: TimeBlock[];
  stepMinutes?: number;
  nowMs?: number;
}): ComputedSlot[] {
  const {
    date,
    weekday,
    durationMinutes,
    barbers,
    selectedBarberId,
    selectedServiceIds,
    appointments,
    timeBlocks,
    stepMinutes = 30,
    nowMs = Date.now(),
  } = params;

  if (durationMinutes <= 0) return [];

  const eligibleBarbers = barbers.filter((b) => {
    if (!b.active) return false;
    if (selectedBarberId !== 'any' && b.id !== selectedBarberId) return false;
    return selectedServiceIds.every((sid) => b.serviceIds.includes(sid));
  });

  if (eligibleBarbers.length === 0) return [];

  const slotMap = new Map<string, ComputedSlot>();

  for (const barber of eligibleBarbers) {
    const wh = barber.workingHours.find((w) => w.weekday === weekday && w.active);
    if (!wh) continue;

    const workStart = timeToMinutes(wh.startTime);
    const workEnd = timeToMinutes(wh.endTime);
    const breakStart = wh.breakStart ? timeToMinutes(wh.breakStart) : null;
    const breakEnd = wh.breakEnd ? timeToMinutes(wh.breakEnd) : null;

    for (let t = workStart; t + durationMinutes <= workEnd; t += stepMinutes) {
      const startTime = minutesToTime(t);
      const endTime = minutesToTime(t + durationMinutes);

      if (breakStart !== null && breakEnd !== null && rangesOverlap(t, t + durationMinutes, breakStart, breakEnd)) {
        continue;
      }

      const conflict = hasConflict({
        barberId: barber.id,
        date,
        startTime,
        endTime,
        appointments,
        timeBlocks,
        nowMs,
      });

      if (!conflict) {
        if (!slotMap.has(startTime)) {
          slotMap.set(startTime, {
            startTime,
            endTime,
            barberId: barber.id,
            available: true,
          });
        }
      }
    }
  }

  return Array.from(slotMap.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function matchesWaitlistPeriod(startTime: string, period: WaitlistPeriod): boolean {
  if (period === 'any') return true;
  const mins = timeToMinutes(startTime);
  if (period === 'morning') return mins < 12 * 60;
  if (period === 'afternoon') return mins >= 12 * 60 && mins < 18 * 60;
  return mins >= 18 * 60;
}

export interface FinancialSummary {
  expectedRevenueCents: number;
  realizedRevenueCents: number;
  depositsReceivedCents: number;
  chairRemainingCents: number;
  retainedNoShowCents: number;
  completedCount: number;
  confirmedCount: number;
  cancelledCount: number;
  noShowCount: number;
  recoveredSlotsCount: number;
}

/**
 * Financial rules (PRD Section 19.2):
 * Deposit is PART of the service price — never double-counted as separate revenue.
 */
export function calculateFinancialSummary(
  appointments: Appointment[],
  transfers: TransferListing[]
): FinancialSummary {
  let expectedRevenueCents = 0;
  let realizedRevenueCents = 0;
  let depositsReceivedCents = 0;
  let chairRemainingCents = 0;
  let retainedNoShowCents = 0;
  let completedCount = 0;
  let confirmedCount = 0;
  let cancelledCount = 0;
  let noShowCount = 0;

  for (const appt of appointments) {
    if (appt.status === 'confirmed' || appt.status === 'in_progress') {
      confirmedCount += 1;
      expectedRevenueCents += appt.totalPriceCents;
      depositsReceivedCents += appt.depositCents;
      chairRemainingCents += Math.max(0, appt.totalPriceCents - appt.depositCents);
    } else if (appt.status === 'completed') {
      completedCount += 1;
      realizedRevenueCents += appt.totalPriceCents;
      depositsReceivedCents += appt.depositCents;
    } else if (appt.status === 'no_show') {
      noShowCount += 1;
      retainedNoShowCents += appt.depositCents;
      realizedRevenueCents += appt.depositCents;
      depositsReceivedCents += appt.depositCents;
    } else if (appt.status === 'cancelled') {
      cancelledCount += 1;
    }
  }

  const recoveredSlotsCount = transfers.filter((t) => t.status === 'completed').length;

  return {
    expectedRevenueCents,
    realizedRevenueCents,
    depositsReceivedCents,
    chairRemainingCents,
    retainedNoShowCents,
    completedCount,
    confirmedCount,
    cancelledCount,
    noShowCount,
    recoveredSlotsCount,
  };
}
