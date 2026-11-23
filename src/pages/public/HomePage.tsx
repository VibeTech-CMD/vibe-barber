import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  Instagram,
  MapPin,
  Phone,
  Repeat,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { useVibeStore } from '@/services/vibeStore';
import { formatBRL } from '@/config/brand';
import { Badge, Button, Card } from '@/components/ui/primitives';

export function HomePage() {
  const { state } = useVibeStore();
  const activeServices = state.services.filter((s) => s.active);
  const activeBarbers = state.barbers.filter((b) => b.active);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-14">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-surface via-obsidian to-gold/10 p-7 sm:p-12 shadow-2xl">
        <div className="max-w-2xl space-y-5 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="gold">
              <Sparkles className="w-3.5 h-3.5" /> Agenda em tempo real
            </Badge>
            <Badge tone="confirm">
              Sinal Pix {formatBRL(state.settings.fixedDepositCents)} abatido no corte
            </Badge>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-ink">
            Seu estilo. Seu horário.{' '}
            <span className="text-gold">Sua experiência.</span>
          </h1>

          <p className="text-base sm:text-lg text-ink-muted leading-relaxed">
            Agende seu próximo atendimento com praticidade. Escolha seus serviços, seu profissional
            e o horário ideal — sem esperar resposta no WhatsApp.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/agendar">
              <Button size="lg" variant="primary">
                Agendar agora <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#servicos">
              <Button size="lg" variant="outline">
                Conhecer serviços
              </Button>
            </a>
          </div>
        </div>

        {/* Value Props */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-10 pt-8 border-t border-white/10">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-gold/15 text-gold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-ink">Cadeira garantida</div>
              <p className="text-xs text-ink-muted">Sinal via Pix que protege você e o barbeiro contra faltas.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-info/15 text-info">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-ink">Repasse &amp; Fila de Espera</div>
              <p className="text-xs text-ink-muted">Teve imprevisto? Repasse sua vaga e recupere o sinal.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-confirm/15 text-confirm">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-ink">Sem atrasos</div>
              <p className="text-xs text-ink-muted">Duração calculada automaticamente para cada serviço.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" className="space-y-5">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-widest text-gold font-bold">Catálogo</p>
            <h2 className="text-2xl font-extrabold text-ink">Nossos Serviços</h2>
          </div>
          <Link to="/agendar" className="text-sm font-semibold text-gold hover:underline">
            Combinar múltiplos serviços →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeServices.map((srv) => (
            <Card key={srv.id} className="flex flex-col justify-between gap-4 hover:border-gold/40 transition-colors">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge tone="muted">{srv.category}</Badge>
                  <span className="font-mono text-base font-bold text-gold-light">
                    {formatBRL(srv.priceCents)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-ink">{srv.name}</h3>
                <p className="text-sm text-ink-muted mt-1">{srv.description}</p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <span className="text-xs text-ink-muted inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {srv.durationMinutes} min
                </span>
                <Link to={`/agendar?service=${srv.id}`}>
                  <Button size="sm" variant="secondary">
                    Selecionar
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Equipe */}
      <section id="equipe" className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold font-bold">Profissionais</p>
          <h2 className="text-2xl font-extrabold text-ink">Nossa Equipe</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeBarbers.map((barber) => (
            <Card key={barber.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-deep font-extrabold text-base shrink-0"
                  style={{ backgroundColor: barber.avatarColor }}
                >
                  {barber.avatarInitials}
                </div>
                <div>
                  <h3 className="font-bold text-ink">{barber.displayName}</h3>
                  <div className="text-xs text-gold inline-flex items-center gap-1 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-gold" /> {barber.rating.toFixed(1)}
                  </div>
                </div>
              </div>
              <p className="text-sm text-ink-muted">{barber.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {barber.specialties.map((spec) => (
                  <Badge key={spec} tone="muted">{spec}</Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Informações & Política */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <h3 className="text-lg font-bold text-ink">Onde estamos e Horários</h3>
          <div className="space-y-2 text-sm text-ink-muted">
            <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gold shrink-0" /> {state.barbershop.address}</p>
            <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-gold shrink-0" /> {state.barbershop.openingHoursText}</p>
            <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-gold shrink-0" /> {state.barbershop.phone}</p>
            <p className="flex items-center gap-2"><Instagram className="w-4 h-4 text-gold shrink-0" /> {state.barbershop.instagram}</p>
          </div>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-lg font-bold text-ink">Política de Sinal e Cancelamento</h3>
          <p className="text-sm text-ink-muted leading-relaxed">
            {state.settings.cancellationPolicyText}
          </p>
          <div className="flex flex-wrap gap-3 pt-1 text-xs">
            <Link to="/politica" className="text-gold font-semibold hover:underline">
              Ver política completa →
            </Link>
            <Link to="/privacidade" className="text-ink-muted hover:text-ink underline">
              Privacidade &amp; LGPD
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
