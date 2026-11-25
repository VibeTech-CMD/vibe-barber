export type UserRole = 'client' | 'barber' | 'admin';

export type AppointmentStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'no_show'
  | 'transferred';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'expired'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export type TransferStatus =
  | 'available'
  | 'negotiating'
  | 'claimed_pending'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type WaitlistPeriod = 'morning' | 'afternoon' | 'evening' | 'any';
export type WaitlistStatus = 'active' | 'offered' | 'fulfilled' | 'cancelled' | 'expired';
export type SwapStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';

export interface Barbershop {
  id: string;
  name: string;
  slug: string;
  description: string;
  phone: string;
  email: string;
  whatsapp: string;
  instagram: string;
  address: string;
  timezone: string;
  openingHoursText: string;
}

export interface Profile {
  id: string;
  fullName: string;
  cpf?: string; // 11 digits normalized
  phone: string;
  email?: string;
  role: UserRole;
  barberId?: string;
  createdAt: string;
}

export interface MasterNotification {
  id: string;
  title: string;
  message: string;
  tone: 'gold' | 'confirm' | 'info' | 'alert';
  read: boolean;
  createdAt: string;
}

export interface BarberWorkingHour {
  weekday: number; // 0 = Dom .. 6 = Sab
  startTime: string; // '09:00'
  endTime: string; // '19:00'
  breakStart?: string; // '12:00'
  breakEnd?: string; // '13:00'
  active: boolean;
}

export interface Barber {
  id: string;
  displayName: string;
  description: string;
  specialties: string[];
  serviceIds: string[];
  avatarInitials: string;
  avatarColor: string;
  rating: number;
  active: boolean;
  workingHours: BarberWorkingHour[];
}

export interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  durationMinutes: number;
  priceCents: number;
  bufferMinutes: number;
  depositCents: number;
  active: boolean;
}

export interface TimeBlock {
  id: string;
  barberId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface AppointmentItemSnapshot {
  serviceId: string;
  serviceNameSnapshot: string;
  durationSnapshot: number;
  priceSnapshotCents: number;
}

export interface Appointment {
  id: string;
  appointmentCode: string;
  customerProfileId: string;
  customerName: string;
  customerCpf?: string;
  customerPhone: string;
  barberId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: AppointmentStatus;
  totalPriceCents: number;
  depositCents: number;
  items: AppointmentItemSnapshot[];
  notes?: string;
  expiresAt?: number;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  appointmentId: string;
  amountCents: number;
  status: PaymentStatus;
  provider: 'demo_pix' | 'asaas' | 'mercadopago';
  externalId: string;
  paymentType: 'deposit' | 'balance' | 'refund';
  createdAt: string;
  updatedAt: string;
}

export interface TransferListing {
  id: string;
  appointmentId: string;
  originalCustomerId: string;
  status: TransferStatus;
  note?: string;
  offeredAt: string;
  expiresAt: string;
  claimedByCustomerId?: string;
  completedAt?: string;
}

export interface WaitlistEntry {
  id: string;
  customerProfileId: string;
  customerName: string;
  serviceId: string;
  barberId: string | 'any';
  preferredDate: string; // YYYY-MM-DD
  preferredPeriod: WaitlistPeriod;
  status: WaitlistStatus;
  expiresAt: string;
  createdAt: string;
}

export interface SwapRequest {
  id: string;
  appointmentAId: string;
  appointmentBId: string;
  requesterId: string;
  targetCustomerId: string;
  note: string;
  status: SwapStatus;
  expiresAt: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actorName: string;
  eventType: string;
  referenceId?: string;
  description: string;
  createdAt: string;
}

export interface ShopSettings {
  requireDeposit: boolean;
  depositMode: 'fixed' | 'per_service';
  fixedDepositCents: number;
  paymentTimeoutMinutes: number;
  minAdvanceMinutes: number;
  maxFutureDays: number;
  freeCancelHours: number;
  cancellationPolicyText: string;
  allowTransfers: boolean;
  allowSwaps: boolean;
  pixKey: string;
}

export interface VibeBarberState {
  barbershop: Barbershop;
  settings: ShopSettings;
  profiles: Profile[];
  activeProfileId: string;
  masterAuthenticated: boolean;
  masterNotifications: MasterNotification[];
  barbers: Barber[];
  services: Service[];
  timeBlocks: TimeBlock[];
  appointments: Appointment[];
  payments: PaymentRecord[];
  transfers: TransferListing[];
  waitlist: WaitlistEntry[];
  swaps: SwapRequest[];
  activityLogs: ActivityLog[];
}
