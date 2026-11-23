export const BRAND_CONFIG = {
  appName: 'Vibe Barber',
  developerName: 'Vibetech',
  developerUrl:
    import.meta.env.VITE_VIBETECH_URL || 'https://vibetech-cmd.github.io/VIBETECH/',
  demoMode: import.meta.env.VITE_DEMO_MODE !== 'false',
  timezone: 'America/Sao_Paulo',
  version: '1.0.0',
} as const;

export function formatBRL(cents: number): string {
  return (Math.round(cents) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

export function getUpcomingDates(count = 14) {
  const today = new Date();
  const dowNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthNames = [
    'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez',
  ];

  return Array.from({ length: count }, (_, i) => {
    const d = addDays(today, i);
    return {
      iso: toISODate(d),
      weekday: d.getDay(),
      day: String(d.getDate()).padStart(2, '0'),
      month: monthNames[d.getMonth()],
      dow: i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : dowNames[d.getDay()],
      fullLabel:
        i === 0
          ? `Hoje, ${d.getDate()} de ${monthNames[d.getMonth()]}`
          : i === 1
            ? `Amanhã, ${d.getDate()} de ${monthNames[d.getMonth()]}`
            : `${dowNames[d.getDay()]}, ${d.getDate()} de ${monthNames[d.getMonth()]}`,
    };
  });
}

export function formatDateBR(iso: string): string {
  const upcoming = getUpcomingDates(30);
  const found = upcoming.find((d) => d.iso === iso);
  if (found) return found.fullLabel;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
