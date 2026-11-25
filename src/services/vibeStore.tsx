import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type {
  Appointment,
  AppointmentStatus,
  Barber,
  Barbershop,
  MasterNotification,
  Profile,
  Service,
  ShopSettings,
  VibeBarberState,
  WaitlistPeriod,
} from '@/types/domain';
import { addDays, formatBRL, minutesToTime, timeToMinutes, toISODate } from '@/config/brand';
import {
  calculateServicesTotals,
  hasConflict,
} from '@/features/availability/engine';

const STORAGE_KEY = 'vibe_barber_v2_state';

export const DEMO_MASTER_CREDENTIALS = {
  email: 'dono@vibebarber.com.br',
  password: 'vibe123',
};

export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

export function formatCpf(value: string): string {
  const digits = normalizeCpf(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function maskClientName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || 'Cliente';
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}

function defaultWorkingHours() {
  return [
    { weekday: 0, startTime: '09:00', endTime: '14:00', active: false },
    { weekday: 1, startTime: '09:00', endTime: '19:00', breakStart: '12:00', breakEnd: '13:00', active: true },
    { weekday: 2, startTime: '09:00', endTime: '19:00', breakStart: '12:00', breakEnd: '13:00', active: true },
    { weekday: 3, startTime: '09:00', endTime: '19:00', breakStart: '12:00', breakEnd: '13:00', active: true },
    { weekday: 4, startTime: '09:00', endTime: '19:00', breakStart: '12:00', breakEnd: '13:00', active: true },
    { weekday: 5, startTime: '09:00', endTime: '20:00', breakStart: '12:00', breakEnd: '13:00', active: true },
    { weekday: 6, startTime: '09:00', endTime: '18:00', breakStart: '12:00', breakEnd: '13:00', active: true },
  ];
}

export function createSeedState(): VibeBarberState {
  const today = new Date();
  const d0 = toISODate(addDays(today, 0));
  const d1 = toISODate(addDays(today, 1));
  const d2 = toISODate(addDays(today, 2));
  const nowIso = new Date().toISOString();

  const allServiceIds = ['srv_1', 'srv_2', 'srv_3', 'srv_4', 'srv_5', 'srv_6'];

  return {
    barbershop: {
      id: 'shop_vibe',
      name: 'Vibe Barber',
      slug: 'vibe-barber',
      description:
        'Barbearia premium contemporânea. Agendamento online sem filas, sinal via Pix e gestão inteligente de horários.',
      phone: '(11) 99450-1020',
      email: 'contato@vibebarber.com.br',
      whatsapp: '5511994501020',
      instagram: '@vibebarber.oficial',
      address: 'Av. Paulista, 1420 — Bela Vista, São Paulo - SP',
      timezone: 'America/Sao_Paulo',
      openingHoursText: 'Seg a Sex: 09h às 19h • Sáb: 09h às 18h',
    },
    settings: {
      requireDeposit: true,
      depositMode: 'fixed',
      fixedDepositCents: 1000,
      paymentTimeoutMinutes: 10,
      minAdvanceMinutes: 30,
      maxFutureDays: 14,
      freeCancelHours: 2,
      cancellationPolicyText:
        'Cancelamento gratuito até 2 horas antes do horário marcado. Após esse prazo, você pode disponibilizar sua vaga no Mural de Repasse para recuperar o sinal.',
      allowTransfers: true,
      allowSwaps: true,
      pixKey: 'pagamentos@vibebarber.com.br',
    },
    profiles: [
      { id: 'usr_lucas', fullName: 'Lucas Mendes', cpf: '11111111111', phone: '(11) 98412-3310', email: 'lucas@email.com', role: 'client', createdAt: nowIso },
      { id: 'usr_rafael', fullName: 'Rafael Souza', cpf: '22222222222', phone: '(11) 97220-8841', email: 'rafael@email.com', role: 'client', createdAt: nowIso },
      { id: 'usr_matheus', fullName: 'Matheus Oliveira', cpf: '33333333333', phone: '(11) 99104-5529', email: 'matheus@email.com', role: 'client', createdAt: nowIso },
      { id: 'usr_barber_carlos', fullName: 'Carlos "Navalha"', phone: '(11) 98800-1101', email: 'carlos@vibebarber.com.br', role: 'barber', barberId: 'brb_carlos', createdAt: nowIso },
      { id: 'usr_admin', fullName: 'Dono da Barbearia (Master)', phone: '(11) 99450-1020', email: DEMO_MASTER_CREDENTIALS.email, role: 'admin', createdAt: nowIso },
    ],
    activeProfileId: 'usr_lucas',
    masterAuthenticated: false,
    masterNotifications: [
      {
        id: 'ntf_1',
        title: 'Sinal Pix confirmado • #VB-4821',
        message: 'Lucas Mendes garantiu hoje às 10:00 (Combo Vibe) com sinal de R$ 10,00.',
        tone: 'confirm',
        read: false,
        createdAt: nowIso,
      },
      {
        id: 'ntf_2',
        title: 'Vaga disponível no Mural de Repasse',
        message: 'Horário de hoje às 17:00 com Carlos "Navalha" foi colocado para repasse.',
        tone: 'info',
        read: false,
        createdAt: nowIso,
      },
    ],
    barbers: [
      {
        id: 'brb_carlos',
        displayName: 'Carlos "Navalha"',
        description: 'Especialista em degradê navalhado e acabamento clássico com 9 anos de experiência.',
        specialties: ['Degradê', 'Navalhado', 'Barba'],
        serviceIds: allServiceIds,
        avatarInitials: 'CN',
        avatarColor: '#E8B04B',
        rating: 4.9,
        active: true,
        workingHours: defaultWorkingHours(),
      },
      {
        id: 'brb_diego',
        displayName: 'Diego Fade',
        description: 'Referência em cortes modernos, freestyle e visagismo masculino.',
        specialties: ['Fade', 'Freestyle', 'Platinado'],
        serviceIds: allServiceIds,
        avatarInitials: 'DF',
        avatarColor: '#38BDF8',
        rating: 4.8,
        active: true,
        workingHours: defaultWorkingHours(),
      },
      {
        id: 'brb_thiago',
        displayName: 'Thiago Classic',
        description: 'Domínio de tesoura, corte executivo e ritual de barboterapia com toalha quente.',
        specialties: ['Tesoura', 'Social', 'Barboterapia'],
        serviceIds: allServiceIds,
        avatarInitials: 'TC',
        avatarColor: '#22C55E',
        rating: 5.0,
        active: true,
        workingHours: defaultWorkingHours(),
      },
    ],
    services: [
      { id: 'srv_1', name: 'Corte Degradê / Fade', description: 'Acabamento na navalha, lavagem e finalização premium.', category: 'Cabelo', durationMinutes: 45, priceCents: 5000, bufferMinutes: 0, depositCents: 1000, active: true },
      { id: 'srv_2', name: 'Corte Social na Tesoura', description: 'Corte clássico na tesoura com finalização matte.', category: 'Cabelo', durationMinutes: 45, priceCents: 4500, bufferMinutes: 0, depositCents: 1000, active: true },
      { id: 'srv_3', name: 'Barboterapia Navalhada', description: 'Toalha quente, espuma artesanal e óleo hidratante.', category: 'Barba', durationMinutes: 30, priceCents: 3500, bufferMinutes: 0, depositCents: 1000, active: true },
      { id: 'srv_4', name: 'Combo Vibe (Corte + Barba)', description: 'Experiência completa com corte, barboterapia e sobrancelha.', category: 'Combos', durationMinutes: 60, priceCents: 7500, bufferMinutes: 0, depositCents: 1500, active: true },
      { id: 'srv_5', name: 'Sobrancelha na Navalha', description: 'Alinhamento limpo mantendo o desenho natural.', category: 'Acabamento', durationMinutes: 15, priceCents: 2000, bufferMinutes: 0, depositCents: 500, active: true },
      { id: 'srv_6', name: 'Pezinho & Acabamento', description: 'Manutenção rápida de contorno e nuca entre cortes.', category: 'Acabamento', durationMinutes: 15, priceCents: 2000, bufferMinutes: 0, depositCents: 500, active: true },
    ],
    timeBlocks: [
      { id: 'blk_1', barberId: 'brb_carlos', date: d0, startTime: '13:00', endTime: '14:00', reason: 'Reunião interna', createdBy: 'Master', createdAt: nowIso },
    ],
    appointments: [
      {
        id: 'apt_101',
        appointmentCode: 'VB-4821',
        customerProfileId: 'usr_lucas',
        customerName: 'Lucas Mendes',
        customerCpf: '11111111111',
        customerPhone: '(11) 98412-3310',
        barberId: 'brb_carlos',
        date: d0,
        startTime: '10:00',
        endTime: '11:00',
        status: 'confirmed',
        totalPriceCents: 7500,
        depositCents: 1000,
        items: [{ serviceId: 'srv_4', serviceNameSnapshot: 'Combo Vibe (Corte + Barba)', durationSnapshot: 60, priceSnapshotCents: 7500 }],
        createdAt: nowIso,
      },
      {
        id: 'apt_102',
        appointmentCode: 'VB-4822',
        customerProfileId: 'usr_rafael',
        customerName: 'Rafael Souza',
        customerCpf: '22222222222',
        customerPhone: '(11) 97220-8841',
        barberId: 'brb_carlos',
        date: d0,
        startTime: '15:00',
        endTime: '15:45',
        status: 'confirmed',
        totalPriceCents: 5000,
        depositCents: 1000,
        items: [{ serviceId: 'srv_1', serviceNameSnapshot: 'Corte Degradê / Fade', durationSnapshot: 45, priceSnapshotCents: 5000 }],
        createdAt: nowIso,
      },
      {
        id: 'apt_103',
        appointmentCode: 'VB-4825',
        customerProfileId: 'usr_matheus',
        customerName: 'Matheus Oliveira',
        customerCpf: '33333333333',
        customerPhone: '(11) 99104-5529',
        barberId: 'brb_carlos',
        date: d0,
        startTime: '17:00',
        endTime: '17:45',
        status: 'confirmed',
        totalPriceCents: 5000,
        depositCents: 1000,
        items: [{ serviceId: 'srv_1', serviceNameSnapshot: 'Corte Degradê / Fade', durationSnapshot: 45, priceSnapshotCents: 5000 }],
        createdAt: nowIso,
      },
      {
        id: 'apt_104',
        appointmentCode: 'VB-4830',
        customerProfileId: 'usr_rafael',
        customerName: 'Rafael Souza',
        customerCpf: '22222222222',
        customerPhone: '(11) 97220-8841',
        barberId: 'brb_diego',
        date: d1,
        startTime: '14:00',
        endTime: '15:00',
        status: 'confirmed',
        totalPriceCents: 7500,
        depositCents: 1000,
        items: [{ serviceId: 'srv_4', serviceNameSnapshot: 'Combo Vibe (Corte + Barba)', durationSnapshot: 60, priceSnapshotCents: 7500 }],
        createdAt: nowIso,
      },
      {
        id: 'apt_105',
        appointmentCode: 'VB-4810',
        customerProfileId: 'usr_lucas',
        customerName: 'Lucas Mendes',
        customerCpf: '11111111111',
        customerPhone: '(11) 98412-3310',
        barberId: 'brb_thiago',
        date: d2,
        startTime: '11:00',
        endTime: '11:30',
        status: 'completed',
        totalPriceCents: 3500,
        depositCents: 1000,
        items: [{ serviceId: 'srv_3', serviceNameSnapshot: 'Barboterapia Navalhada', durationSnapshot: 30, priceSnapshotCents: 3500 }],
        createdAt: nowIso,
      },
    ],
    payments: [
      { id: 'pay_1', appointmentId: 'apt_101', amountCents: 1000, status: 'paid', provider: 'demo_pix', externalId: 'DEMO-4821', paymentType: 'deposit', createdAt: nowIso, updatedAt: nowIso },
      { id: 'pay_2', appointmentId: 'apt_102', amountCents: 1000, status: 'paid', provider: 'demo_pix', externalId: 'DEMO-4822', paymentType: 'deposit', createdAt: nowIso, updatedAt: nowIso },
      { id: 'pay_3', appointmentId: 'apt_103', amountCents: 1000, status: 'paid', provider: 'demo_pix', externalId: 'DEMO-4825', paymentType: 'deposit', createdAt: nowIso, updatedAt: nowIso },
      { id: 'pay_4', appointmentId: 'apt_104', amountCents: 1000, status: 'paid', provider: 'demo_pix', externalId: 'DEMO-4830', paymentType: 'deposit', createdAt: nowIso, updatedAt: nowIso },
    ],
    transfers: [
      {
        id: 'trf_1',
        appointmentId: 'apt_103',
        originalCustomerId: 'usr_matheus',
        status: 'available',
        note: 'Vaga liberada para repasse — pagamento de sinal garante transferência imediata.',
        offeredAt: nowIso,
        expiresAt: addDays(today, 1).toISOString(),
      },
    ],
    waitlist: [
      {
        id: 'wl_1',
        customerProfileId: 'usr_lucas',
        customerName: 'Lucas Mendes',
        serviceId: 'srv_1',
        barberId: 'brb_carlos',
        preferredDate: d1,
        preferredPeriod: 'afternoon',
        status: 'active',
        expiresAt: addDays(today, 3).toISOString(),
        createdAt: nowIso,
      },
    ],
    swaps: [
      {
        id: 'swp_1',
        appointmentAId: 'apt_102',
        appointmentBId: 'apt_101',
        requesterId: 'usr_rafael',
        targetCustomerId: 'usr_lucas',
        note: 'Consegue trocar comigo? Preciso cortar de manhã hoje.',
        status: 'pending',
        expiresAt: addDays(today, 1).toISOString(),
        createdAt: nowIso,
      },
    ],
    activityLogs: [
      { id: 'log_1', actorName: 'Sistema', eventType: 'transfer_offered', referenceId: 'apt_103', description: 'Uma vaga de hoje às 17:00 entrou no mural de repasse.', createdAt: nowIso },
      { id: 'log_2', actorName: 'Rafael Souza', eventType: 'swap_proposed', referenceId: 'swp_1', description: 'Proposta de troca enviada entre horários #VB-4822 e #VB-4821.', createdAt: nowIso },
    ],
  };
}

function loadInitialState(): VibeBarberState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as VibeBarberState;
    if (!parsed?.barbershop || !Array.isArray(parsed.appointments)) return createSeedState();
    if (!Array.isArray(parsed.masterNotifications)) parsed.masterNotifications = [];
    return parsed;
  } catch {
    return createSeedState();
  }
}

function generateUniqueCode(existing: Appointment[]): string {
  const used = new Set(existing.map((a) => a.appointmentCode));
  for (let i = 0; i < 50; i++) {
    const code = `VB-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!used.has(code)) return code;
  }
  return `VB-${Date.now().toString().slice(-4)}`;
}

interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

export interface CpfLookupResult {
  found: boolean;
  profileId?: string;
  maskedName?: string;
}

interface VibeStoreValue {
  state: VibeBarberState;
  activeProfile: Profile;
  unreadNotificationsCount: number;
  setActiveProfile: (profileId: string) => void;
  lookupClientByCpf: (rawCpf: string) => CpfLookupResult;
  identifyClientByCpf: (rawCpf: string) => ActionResult<{ maskedName: string }>;
  loginMaster: (email: string, password: string) => ActionResult;
  logoutMaster: () => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  createBooking: (input: {
    serviceIds: string[];
    barberId: string;
    date: string;
    startTime: string;
    customerCpf?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
  }) => ActionResult<Appointment>;
  confirmDemoPayment: (appointmentId: string) => ActionResult<Appointment>;
  expireDemoPayment: (appointmentId: string) => ActionResult;
  cancelAppointment: (appointmentId: string, reason?: string) => ActionResult;
  offerTransfer: (appointmentId: string, note?: string) => ActionResult;
  cancelTransfer: (transferId: string) => ActionResult;
  claimTransfer: (transferId: string) => ActionResult<Appointment>;
  joinWaitlist: (input: {
    serviceId: string;
    barberId: string | 'any';
    preferredDate: string;
    preferredPeriod: WaitlistPeriod;
  }) => ActionResult;
  cancelWaitlist: (entryId: string) => void;
  proposeSwap: (appointmentAId: string, appointmentBId: string, note?: string) => ActionResult;
  respondSwap: (swapId: string, accept: boolean) => ActionResult;
  updateAppointmentStatus: (appointmentId: string, status: AppointmentStatus) => ActionResult;
  addTimeBlock: (input: { barberId: string; date: string; startTime: string; endTime: string; reason: string }) => ActionResult;
  removeTimeBlock: (blockId: string) => void;
  saveService: (service: Omit<Service, 'id'> & { id?: string }) => void;
  toggleServiceActive: (serviceId: string) => void;
  saveBarber: (barber: { id?: string; displayName: string; description: string; specialties: string[]; active: boolean }) => void;
  toggleBarberActive: (barberId: string) => void;
  updateBarbershop: (partial: Partial<Barbershop>) => void;
  updateSettings: (partial: Partial<ShopSettings>) => void;
  resetDemoData: () => void;
}

const VibeStoreContext = createContext<VibeStoreValue | null>(null);

export function VibeStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VibeBarberState>(loadInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  const activeProfile = useMemo(
    () => state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0],
    [state.profiles, state.activeProfileId]
  );

  const unreadNotificationsCount = useMemo(
    () => state.masterNotifications.filter((n) => !n.read).length,
    [state.masterNotifications]
  );

  const pushLog = (
    draft: VibeBarberState,
    actorName: string,
    eventType: string,
    description: string,
    referenceId?: string
  ) => {
    draft.activityLogs = [
      {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        actorName,
        eventType,
        referenceId,
        description,
        createdAt: new Date().toISOString(),
      },
      ...draft.activityLogs,
    ].slice(0, 60);
  };

  const pushMasterNotification = (
    draft: VibeBarberState,
    title: string,
    message: string,
    tone: MasterNotification['tone'] = 'gold'
  ) => {
    draft.masterNotifications = [
      {
        id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title,
        message,
        tone,
        read: false,
        createdAt: new Date().toISOString(),
      },
      ...draft.masterNotifications,
    ].slice(0, 40);
  };

  const value: VibeStoreValue = {
    state,
    activeProfile,
    unreadNotificationsCount,

    setActiveProfile(profileId) {
      setState((prev) => ({ ...prev, activeProfileId: profileId }));
    },

    lookupClientByCpf(rawCpf) {
      const digits = normalizeCpf(rawCpf);
      if (digits.length !== 11) return { found: false };
      const match = state.profiles.find((p) => p.role === 'client' && p.cpf === digits);
      if (!match) return { found: false };
      return {
        found: true,
        profileId: match.id,
        maskedName: maskClientName(match.fullName),
      };
    },

    identifyClientByCpf(rawCpf) {
      const digits = normalizeCpf(rawCpf);
      if (digits.length !== 11) {
        return { ok: false, error: 'Digite um CPF válido com 11 números.' };
      }
      const match = state.profiles.find((p) => p.role === 'client' && p.cpf === digits);
      if (!match) {
        return {
          ok: false,
          error: 'CPF ainda não encontrado. Faça seu primeiro agendamento para cadastrar automaticamente.',
        };
      }
      setState((prev) => ({ ...prev, activeProfileId: match.id }));
      return { ok: true, data: { maskedName: maskClientName(match.fullName) } };
    },

    loginMaster(email, password) {
      const cleanEmail = email.trim().toLowerCase();
      if (
        cleanEmail === DEMO_MASTER_CREDENTIALS.email.toLowerCase() &&
        password === DEMO_MASTER_CREDENTIALS.password
      ) {
        setState((prev) => ({ ...prev, masterAuthenticated: true }));
        return { ok: true };
      }
      return {
        ok: false,
        error: 'E-mail ou senha incorretos. Use o acesso de demonstração abaixo.',
      };
    },

    logoutMaster() {
      setState((prev) => ({ ...prev, masterAuthenticated: false }));
    },

    markNotificationRead(notificationId) {
      setState((prev) => ({
        ...prev,
        masterNotifications: prev.masterNotifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
      }));
    },

    markAllNotificationsRead() {
      setState((prev) => ({
        ...prev,
        masterNotifications: prev.masterNotifications.map((n) => ({ ...n, read: true })),
      }));
    },

    createBooking(input) {
      const selectedServices = state.services.filter(
        (s) => input.serviceIds.includes(s.id) && s.active
      );
      if (selectedServices.length === 0) {
        return { ok: false, error: 'Selecione ao menos um serviço ativo.' };
      }

      const totals = calculateServicesTotals(selectedServices, state.settings);
      const endTime = minutesToTime(timeToMinutes(input.startTime) + totals.totalDurationMinutes);

      if (
        hasConflict({
          barberId: input.barberId,
          date: input.date,
          startTime: input.startTime,
          endTime,
          appointments: state.appointments,
          timeBlocks: state.timeBlocks,
        })
      ) {
        return {
          ok: false,
          error: 'Este horário acabou de ser ocupado ou bloqueado. Escolha outro horário disponível.',
        };
      }

      const nowIso = new Date().toISOString();
      const digitsCpf = normalizeCpf(input.customerCpf || '');

      // Reuse existing profile by CPF (zero login & zero duplicates!)
      let resolvedProfile = digitsCpf.length === 11
        ? state.profiles.find((p) => p.role === 'client' && p.cpf === digitsCpf)
        : undefined;

      let createdProfile: Profile | null = null;
      if (!resolvedProfile) {
        const cleanName = (input.customerName || '').trim();
        const cleanPhone = (input.customerPhone || '').trim();
        if (cleanName.length < 2) {
          return { ok: false, error: 'Informe seu nome completo para o primeiro cadastro.' };
        }
        if (cleanPhone.length < 10) {
          return { ok: false, error: 'Informe seu WhatsApp com DDD.' };
        }
        createdProfile = {
          id: `usr_${Date.now()}`,
          fullName: cleanName,
          cpf: digitsCpf.length === 11 ? digitsCpf : undefined,
          phone: cleanPhone,
          email: input.customerEmail?.trim() || undefined,
          role: 'client',
          createdAt: nowIso,
        };
        resolvedProfile = createdProfile;
      }

      const needsPayment = state.settings.requireDeposit && totals.depositCents > 0;
      const newAppt: Appointment = {
        id: `apt_${Date.now()}`,
        appointmentCode: generateUniqueCode(state.appointments),
        customerProfileId: resolvedProfile.id,
        customerName: resolvedProfile.fullName,
        customerCpf: resolvedProfile.cpf,
        customerPhone: resolvedProfile.phone,
        barberId: input.barberId,
        date: input.date,
        startTime: input.startTime,
        endTime,
        status: needsPayment ? 'pending_payment' : 'confirmed',
        totalPriceCents: totals.totalPriceCents,
        depositCents: totals.depositCents,
        items: selectedServices.map((s) => ({
          serviceId: s.id,
          serviceNameSnapshot: s.name,
          durationSnapshot: s.durationMinutes,
          priceSnapshotCents: s.priceCents,
        })),
        expiresAt: needsPayment
          ? Date.now() + state.settings.paymentTimeoutMinutes * 60 * 1000
          : undefined,
        createdAt: nowIso,
      };

      const barberName =
        state.barbers.find((b) => b.id === input.barberId)?.displayName || 'Barbeiro';

      setState((prev) => {
        const next: VibeBarberState = {
          ...prev,
          profiles: createdProfile ? [...prev.profiles, createdProfile] : prev.profiles,
          activeProfileId: resolvedProfile!.id,
          appointments: [newAppt, ...prev.appointments],
          payments: needsPayment
            ? [
                {
                  id: `pay_${Date.now()}`,
                  appointmentId: newAppt.id,
                  amountCents: totals.depositCents,
                  status: 'pending',
                  provider: 'demo_pix',
                  externalId: `DEMO-${newAppt.appointmentCode}`,
                  paymentType: 'deposit',
                  createdAt: nowIso,
                  updatedAt: nowIso,
                },
                ...prev.payments,
              ]
            : prev.payments,
          activityLogs: [...prev.activityLogs],
          masterNotifications: [...prev.masterNotifications],
        };
        pushLog(
          next,
          newAppt.customerName,
          'appointment_created',
          `Reserva ${newAppt.appointmentCode} criada para ${newAppt.date} às ${newAppt.startTime}.`,
          newAppt.id
        );
        pushMasterNotification(
          next,
          `Nova pré-reserva • ${newAppt.appointmentCode}`,
          `${newAppt.customerName} reservou ${newAppt.date} às ${newAppt.startTime} com ${barberName} (aguardando Pix de ${formatBRL(newAppt.depositCents)}).`,
          'gold'
        );
        return next;
      });

      return { ok: true, data: newAppt };
    },

    confirmDemoPayment(appointmentId) {
      const target = state.appointments.find((a) => a.id === appointmentId);
      if (!target) return { ok: false, error: 'Reserva não encontrada.' };
      if (target.status === 'expired' || target.status === 'cancelled') {
        return { ok: false, error: 'Esta reserva expirou ou foi cancelada.' };
      }

      const nowIso = new Date().toISOString();
      const updated: Appointment = { ...target, status: 'confirmed', expiresAt: undefined };

      setState((prev) => {
        const next: VibeBarberState = {
          ...prev,
          appointments: prev.appointments.map((a) => (a.id === appointmentId ? updated : a)),
          payments: prev.payments.map((p) =>
            p.appointmentId === appointmentId
              ? { ...p, status: 'paid', updatedAt: nowIso }
              : p
          ),
          activityLogs: [...prev.activityLogs],
          masterNotifications: [...prev.masterNotifications],
        };
        pushLog(
          next,
          target.customerName,
          'payment_demo_confirmed',
          `Sinal Pix confirmado para ${target.appointmentCode}.`,
          target.id
        );
        pushMasterNotification(
          next,
          `Sinal Pix confirmado! • ${target.appointmentCode}`,
          `${target.customerName} confirmou ${formatBRL(target.depositCents)} para ${target.date} às ${target.startTime}.`,
          'confirm'
        );
        return next;
      });

      return { ok: true, data: updated };
    },

    expireDemoPayment(appointmentId) {
      const target = state.appointments.find((a) => a.id === appointmentId);
      if (!target || target.status !== 'pending_payment') {
        return { ok: false, error: 'Reserva não está pendente de pagamento.' };
      }
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const next: VibeBarberState = {
          ...prev,
          appointments: prev.appointments.map((a) =>
            a.id === appointmentId ? { ...a, status: 'expired', expiresAt: undefined } : a
          ),
          payments: prev.payments.map((p) =>
            p.appointmentId === appointmentId ? { ...p, status: 'expired', updatedAt: nowIso } : p
          ),
          activityLogs: [...prev.activityLogs],
        };
        pushLog(
          next,
          'Sistema',
          'payment_expired',
          `Pré-reserva ${target.appointmentCode} expirou e a vaga foi liberada.`,
          target.id
        );
        return next;
      });
      return { ok: true };
    },

    cancelAppointment(appointmentId, reason) {
      const target = state.appointments.find((a) => a.id === appointmentId);
      if (!target) return { ok: false, error: 'Reserva não encontrada.' };
      if (target.status === 'completed' || target.status === 'cancelled') {
        return { ok: false, error: 'Esta reserva não pode ser cancelada.' };
      }
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const next: VibeBarberState = {
          ...prev,
          appointments: prev.appointments.map((a) =>
            a.id === appointmentId
              ? { ...a, status: 'cancelled', cancelledAt: nowIso, cancelReason: reason || 'Cancelado pelo usuário', expiresAt: undefined }
              : a
          ),
          transfers: prev.transfers.map((t) =>
            t.appointmentId === appointmentId && t.status === 'available'
              ? { ...t, status: 'cancelled' }
              : t
          ),
          swaps: prev.swaps.map((s) =>
            s.status === 'pending' && (s.appointmentAId === appointmentId || s.appointmentBId === appointmentId)
              ? { ...s, status: 'cancelled' }
              : s
          ),
          activityLogs: [...prev.activityLogs],
          masterNotifications: [...prev.masterNotifications],
        };
        pushLog(
          next,
          activeProfile.fullName,
          'appointment_cancelled',
          `Reserva ${target.appointmentCode} cancelada (${reason || 'sem motivo informado'}).`,
          target.id
        );
        pushMasterNotification(
          next,
          `Horário cancelado • ${target.appointmentCode}`,
          `${target.customerName} cancelou ${target.date} às ${target.startTime}. Vaga liberada na agenda.`,
          'alert'
        );
        return next;
      });
      return { ok: true };
    },

    offerTransfer(appointmentId, note) {
      const target = state.appointments.find((a) => a.id === appointmentId);
      if (!target || target.status !== 'confirmed') {
        return { ok: false, error: 'Apenas reservas confirmadas podem ir para repasse.' };
      }
      const existing = state.transfers.find(
        (t) => t.appointmentId === appointmentId && ['available', 'negotiating', 'claimed_pending'].includes(t.status)
      );
      if (existing) {
        return { ok: false, error: 'Esta reserva já está disponível no mural de repasse.' };
      }
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const next: VibeBarberState = {
          ...prev,
          transfers: [
            {
              id: `trf_${Date.now()}`,
              appointmentId,
              originalCustomerId: target.customerProfileId,
              status: 'available',
              note: note?.trim(),
              offeredAt: nowIso,
              expiresAt: addDays(new Date(), 2).toISOString(),
            },
            ...prev.transfers,
          ],
          activityLogs: [...prev.activityLogs],
          masterNotifications: [...prev.masterNotifications],
        };
        pushLog(
          next,
          activeProfile.fullName,
          'transfer_offered',
          `Vaga de ${target.date} às ${target.startTime} disponibilizada no mural de repasse.`,
          target.id
        );
        pushMasterNotification(
          next,
          'Horário colocado em repasse',
          `A vaga de ${target.date} às ${target.startTime} entrou no Mural de Repasses.`,
          'info'
        );
        return next;
      });
      return { ok: true };
    },

    cancelTransfer(transferId) {
      setState((prev) => ({
        ...prev,
        transfers: prev.transfers.map((t) =>
          t.id === transferId ? { ...t, status: 'cancelled' } : t
        ),
      }));
      return { ok: true };
    },

    claimTransfer(transferId) {
      const listing = state.transfers.find((t) => t.id === transferId && t.status === 'available');
      if (!listing) return { ok: false, error: 'Esta vaga de repasse não está mais disponível.' };
      if (listing.originalCustomerId === activeProfile.id) {
        return { ok: false, error: 'Você já é o titular desta reserva.' };
      }
      const origAppt = state.appointments.find((a) => a.id === listing.appointmentId && a.status === 'confirmed');
      if (!origAppt) return { ok: false, error: 'Reserva original não está mais elegível.' };

      const nowIso = new Date().toISOString();
      const newAppt: Appointment = {
        ...origAppt,
        id: `apt_${Date.now()}`,
        appointmentCode: generateUniqueCode(state.appointments),
        customerProfileId: activeProfile.id,
        customerName: activeProfile.fullName,
        customerCpf: activeProfile.cpf,
        customerPhone: activeProfile.phone,
        status: 'confirmed',
        createdAt: nowIso,
      };

      setState((prev) => {
        const next: VibeBarberState = {
          ...prev,
          appointments: [
            newAppt,
            ...prev.appointments.map((a) =>
              a.id === origAppt.id ? { ...a, status: 'transferred' as const } : a
            ),
          ],
          transfers: prev.transfers.map((t) =>
            t.id === transferId
              ? { ...t, status: 'completed', claimedByCustomerId: activeProfile.id, completedAt: nowIso }
              : t
          ),
          payments: [
            {
              id: `pay_${Date.now()}`,
              appointmentId: newAppt.id,
              amountCents: newAppt.depositCents,
              status: 'paid',
              provider: 'demo_pix',
              externalId: `DEMO-TRF-${newAppt.appointmentCode}`,
              paymentType: 'deposit',
              createdAt: nowIso,
              updatedAt: nowIso,
            },
            ...prev.payments.map((p) =>
              p.appointmentId === origAppt.id ? { ...p, status: 'refunded' as const, updatedAt: nowIso } : p
            ),
          ],
          activityLogs: [...prev.activityLogs],
          masterNotifications: [...prev.masterNotifications],
        };
        pushLog(
          next,
          activeProfile.fullName,
          'transfer_completed',
          `Repasse concluído! Vaga de ${newAppt.date} às ${newAppt.startTime} assumida (${newAppt.appointmentCode}).`,
          newAppt.id
        );
        pushMasterNotification(
          next,
          `Repasse concluído! • ${newAppt.appointmentCode}`,
          `${newAppt.customerName} assumiu a vaga de ${newAppt.date} às ${newAppt.startTime}. Agenda 100% mantida!`,
          'confirm'
        );
        return next;
      });

      return { ok: true, data: newAppt };
    },

    joinWaitlist(input) {
      const duplicate = state.waitlist.find(
        (w) =>
          w.status === 'active' &&
          w.customerProfileId === activeProfile.id &&
          w.preferredDate === input.preferredDate &&
          w.preferredPeriod === input.preferredPeriod
      );
      if (duplicate) {
        return { ok: false, error: 'Você já possui uma solicitação ativa para esta data e turno.' };
      }
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const next: VibeBarberState = {
          ...prev,
          waitlist: [
            {
              id: `wl_${Date.now()}`,
              customerProfileId: activeProfile.id,
              customerName: activeProfile.fullName,
              serviceId: input.serviceId,
              barberId: input.barberId,
              preferredDate: input.preferredDate,
              preferredPeriod: input.preferredPeriod,
              status: 'active',
              expiresAt: addDays(new Date(), 5).toISOString(),
              createdAt: nowIso,
            },
            ...prev.waitlist,
          ],
          activityLogs: [...prev.activityLogs],
        };
        pushLog(
          next,
          activeProfile.fullName,
          'waitlist_joined',
          `${activeProfile.fullName} entrou na fila de espera para ${input.preferredDate}.`
        );
        return next;
      });
      return { ok: true };
    },

    cancelWaitlist(entryId) {
      setState((prev) => ({
        ...prev,
        waitlist: prev.waitlist.map((w) =>
          w.id === entryId ? { ...w, status: 'cancelled' } : w
        ),
      }));
    },

    proposeSwap(appointmentAId, appointmentBId, note) {
      const a = state.appointments.find((x) => x.id === appointmentAId && x.status === 'confirmed');
      const b = state.appointments.find((x) => x.id === appointmentBId && x.status === 'confirmed');
      if (!a || !b) return { ok: false, error: 'Ambas as reservas devem estar confirmadas.' };
      if (a.customerProfileId === b.customerProfileId) {
        return { ok: false, error: 'Não é possível trocar um horário consigo mesmo.' };
      }
      const dup = state.swaps.find(
        (s) =>
          s.status === 'pending' &&
          ((s.appointmentAId === a.id && s.appointmentBId === b.id) ||
            (s.appointmentAId === b.id && s.appointmentBId === a.id))
      );
      if (dup) return { ok: false, error: 'Já existe uma proposta pendente entre esses horários.' };

      const nowIso = new Date().toISOString();
      setState((prev) => {
        const next: VibeBarberState = {
          ...prev,
          swaps: [
            {
              id: `swp_${Date.now()}`,
              appointmentAId: a.id,
              appointmentBId: b.id,
              requesterId: a.customerProfileId,
              targetCustomerId: b.customerProfileId,
              note: note?.trim() || 'Podemos trocar nossos horários?',
              status: 'pending',
              expiresAt: addDays(new Date(), 1).toISOString(),
              createdAt: nowIso,
            },
            ...prev.swaps,
          ],
          activityLogs: [...prev.activityLogs],
        };
        pushLog(
          next,
          a.customerName,
          'swap_proposed',
          `Proposta de troca enviada entre ${a.appointmentCode} e ${b.appointmentCode}.`
        );
        return next;
      });
      return { ok: true };
    },

    respondSwap(swapId, accept) {
      const swap = state.swaps.find((s) => s.id === swapId && s.status === 'pending');
      if (!swap) return { ok: false, error: 'Proposta não está mais pendente.' };

      if (!accept) {
        setState((prev) => ({
          ...prev,
          swaps: prev.swaps.map((s) => (s.id === swapId ? { ...s, status: 'rejected' } : s)),
        }));
        return { ok: true };
      }

      const a = state.appointments.find((x) => x.id === swap.appointmentAId && x.status === 'confirmed');
      const b = state.appointments.find((x) => x.id === swap.appointmentBId && x.status === 'confirmed');
      if (!a || !b) return { ok: false, error: 'Uma das reservas não está mais elegível.' };

      setState((prev) => {
        const next: VibeBarberState = {
          ...prev,
          appointments: prev.appointments.map((appt) => {
            if (appt.id === a.id) {
              return { ...appt, date: b.date, startTime: b.startTime, endTime: b.endTime, barberId: b.barberId };
            }
            if (appt.id === b.id) {
              return { ...appt, date: a.date, startTime: a.startTime, endTime: a.endTime, barberId: a.barberId };
            }
            return appt;
          }),
          swaps: prev.swaps.map((s) => {
            if (s.id === swapId) return { ...s, status: 'accepted' };
            if (
              s.status === 'pending' &&
              (s.appointmentAId === a.id || s.appointmentBId === a.id || s.appointmentAId === b.id || s.appointmentBId === b.id)
            ) {
              return { ...s, status: 'cancelled' };
            }
            return s;
          }),
          activityLogs: [...prev.activityLogs],
          masterNotifications: [...prev.masterNotifications],
        };
        pushLog(
          next,
          activeProfile.fullName,
          'swap_accepted',
          `Troca atômica concluída entre ${a.appointmentCode} e ${b.appointmentCode} mantendo os sinais pagos.`
        );
        pushMasterNotification(
          next,
          'Troca de horários concluída',
          `Os horários ${a.appointmentCode} e ${b.appointmentCode} foram trocados automaticamente na agenda.`,
          'info'
        );
        return next;
      });
      return { ok: true };
    },

    updateAppointmentStatus(appointmentId, status) {
      const target = state.appointments.find((a) => a.id === appointmentId);
      if (!target) return { ok: false, error: 'Reserva não encontrada.' };
      setState((prev) => {
        const next: VibeBarberState = {
          ...prev,
          appointments: prev.appointments.map((a) =>
            a.id === appointmentId ? { ...a, status } : a
          ),
          activityLogs: [...prev.activityLogs],
        };
        pushLog(
          next,
          'Dono (Master)',
          `status_${status}`,
          `Reserva ${target.appointmentCode} (${target.customerName}) atualizada para "${status}".`,
          target.id
        );
        return next;
      });
      return { ok: true };
    },

    addTimeBlock(input) {
      if (timeToMinutes(input.endTime) <= timeToMinutes(input.startTime)) {
        return { ok: false, error: 'Horário final deve ser maior que o horário inicial.' };
      }
      setState((prev) => {
        const next: VibeBarberState = {
          ...prev,
          timeBlocks: [
            {
              id: `blk_${Date.now()}`,
              ...input,
              createdBy: 'Dono (Master)',
              createdAt: new Date().toISOString(),
            },
            ...prev.timeBlocks,
          ],
          activityLogs: [...prev.activityLogs],
        };
        pushLog(
          next,
          'Dono (Master)',
          'time_blocked',
          `Bloqueio criado em ${input.date} (${input.startTime}–${input.endTime}): ${input.reason}.`
        );
        return next;
      });
      return { ok: true };
    },

    removeTimeBlock(blockId) {
      setState((prev) => ({
        ...prev,
        timeBlocks: prev.timeBlocks.filter((b) => b.id !== blockId),
      }));
    },

    saveService(input) {
      setState((prev) => {
        const isEdit = Boolean(input.id);
        const id = input.id || `srv_${Date.now()}`;
        const updatedService: Service = { ...input, id };
        const services = isEdit
          ? prev.services.map((s) => (s.id === id ? updatedService : s))
          : [...prev.services, updatedService];
        const barbers = isEdit
          ? prev.barbers
          : prev.barbers.map((b) => ({ ...b, serviceIds: [...b.serviceIds, id] }));
        const next: VibeBarberState = { ...prev, services, barbers, activityLogs: [...prev.activityLogs] };
        pushLog(next, 'Dono (Master)', 'service_saved', `Serviço "${updatedService.name}" ${isEdit ? 'atualizado' : 'cadastrado'}.`);
        return next;
      });
    },

    toggleServiceActive(serviceId) {
      setState((prev) => ({
        ...prev,
        services: prev.services.map((s) =>
          s.id === serviceId ? { ...s, active: !s.active } : s
        ),
      }));
    },

    saveBarber(input) {
      setState((prev) => {
        const isEdit = Boolean(input.id);
        const id = input.id || `brb_${Date.now()}`;
        const initials = input.displayName
          .split(' ')
          .map((p) => p[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        const barbers: Barber[] = isEdit
          ? prev.barbers.map((b) =>
              b.id === id
                ? { ...b, displayName: input.displayName, description: input.description, specialties: input.specialties, active: input.active, avatarInitials: initials }
                : b
            )
          : [
              ...prev.barbers,
              {
                id,
                displayName: input.displayName,
                description: input.description,
                specialties: input.specialties,
                serviceIds: prev.services.map((s) => s.id),
                avatarInitials: initials || 'VB',
                avatarColor: '#E8B04B',
                rating: 5.0,
                active: input.active,
                workingHours: defaultWorkingHours(),
              },
            ];

        const next: VibeBarberState = { ...prev, barbers, activityLogs: [...prev.activityLogs] };
        pushLog(next, 'Dono (Master)', 'barber_saved', `Barbeiro "${input.displayName}" ${isEdit ? 'atualizado' : 'cadastrado'}.`);
        return next;
      });
    },

    toggleBarberActive(barberId) {
      setState((prev) => ({
        ...prev,
        barbers: prev.barbers.map((b) =>
          b.id === barberId ? { ...b, active: !b.active } : b
        ),
      }));
    },

    updateBarbershop(partial) {
      setState((prev) => ({ ...prev, barbershop: { ...prev.barbershop, ...partial } }));
    },

    updateSettings(partial) {
      setState((prev) => ({ ...prev, settings: { ...prev.settings, ...partial } }));
    },

    resetDemoData() {
      const fresh = createSeedState();
      setState(fresh);
    },
  };

  return <VibeStoreContext.Provider value={value}>{children}</VibeStoreContext.Provider>;
}

export function useVibeStore() {
  const ctx = useContext(VibeStoreContext);
  if (!ctx) throw new Error('useVibeStore must be used inside VibeStoreProvider');
  return ctx;
}
