import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  Flame,
  Instagram,
  MapPin,
  Phone,
  Repeat,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import { useVibeStore } from '@/services/vibeStore';
import { formatBRL } from '@/config/brand';
import { Badge, Button, Card } from '@/components/ui/primitives';

const MARQUEE_ITEMS = [
  'DEGRADÊ NAVALHADO',
  'BARBOTERAPIA COM TOALHA QUENTE',
  'SINAL VIA PIX ANTI-FALTA',
  'REPASSE INTELIGENTE DE HORÁRIOS',
  'TROCA ATÔMICA ENTRE CLIENTES',
  'ZERO FILAS NO WHATSAPP',
  'ESTÉTICA UNDERGROUND PREMIUM',
];

export function HomePage() {
  const { state } = useVibeStore();
  const activeServices = state.services.filter((s) => s.active);
  const activeBarbers = state.barbers.filter((b) => b.active);
  const baseUrl = import.meta.env.BASE_URL;

  const showcaseCards = [
    {
      title: 'Fade & Navalha de Precisão',
      subtitle: 'Acabamento milimétrico com degradê limpo e estilo contemporâneo.',
      tag: 'Assinatura Vibe',
      image: `${baseUrl}images/hero-barber.jpg`,
      accent: 'from-amber-500/25 via-transparent to-obsidian/95',
    },
    {
      title: 'Ferramentas & Técnica',
      subtitle: 'Tesouras japonesas, navalha clássica e equipamentos de alta performance.',
      tag: 'Alta Performance',
      image: `${baseUrl}images/tools-scissors.jpg`,
      accent: 'from-sky-500/20 via-transparent to-obsidian/95',
    },
    {
      title: 'Ritual de Barboterapia',
      subtitle: 'Toalha quente, espuma artesanal e hidratação profunda sem pressa.',
      tag: 'Experiência VIP',
      image: `${baseUrl}images/beard-ritual.jpg`,
      accent: 'from-orange-500/25 via-transparent to-obsidian/95',
    },
  ];

  return (
    <div className="space-y-16">
      {/* FULL-IMPACT CINEMATIC HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        {/* Background Image + Multi-layered Underground Gradients */}
        <div className="absolute inset-0">
          <img
            src={`${baseUrl}images/hero-barber.jpg`}
            alt="Barbeiro realizando corte degradê na Vibe Barber"
            className="w-full h-full object-cover object-center scale-105 opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07080B] via-[#07080B]/85 to-[#07080B]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07080B] via-transparent to-[#07080B]/70" />
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-gold/20 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-10 w-80 h-80 rounded-full bg-sky-500/15 blur-[110px] pointer-events-none" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-14 sm:py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="gold" className="shadow-md shadow-gold/15">
                <Sparkles className="w-3.5 h-3.5" /> Barbearia &amp; Tecnologia
              </Badge>
              <Badge tone="confirm">
                <Zap className="w-3.5 h-3.5" /> Sinal Pix {formatBRL(state.settings.fixedDepositCents)} abatido no corte
              </Badge>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] text-ink">
              Seu estilo. Seu horário.{' '}
              <span className="text-gold-gradient block sm:inline">Sua experiência.</span>
            </h1>

            <p className="text-base sm:text-lg text-ink-muted max-w-xl leading-relaxed">
              Esqueça a demora no WhatsApp. Escolha seu corte, seu barbeiro e garanta sua cadeira
              em segundos com sinal via Pix, mural de repasse e troca inteligente de horários.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link to="/agendar">
                <Button size="lg" variant="primary" className="px-7 py-3.5 text-base">
                  <Scissors className="w-4 h-4" /> Agendar agora <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="#servicos">
                <Button size="lg" variant="outline" className="px-6 py-3.5 text-base">
                  Explorar serviços
                </Button>
              </a>
            </div>

            {/* Quick Trust Stats */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10 max-w-lg">
              <div>
                <div className="font-mono text-2xl font-extrabold text-gold-gradient">4.9★</div>
                <div className="text-xs text-ink-muted">Avaliação média</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-extrabold text-ink">100%</div>
                <div className="text-xs text-ink-muted">Agenda ao vivo</div>
              </div>
              <div>
                <div className="font-mono text-2xl font-extrabold text-sky-300">0 min</div>
                <div className="text-xs text-ink-muted">De espera no zap</div>
              </div>
            </div>
          </div>

          {/* Right Floating Glass Card */}
          <div className="lg:col-span-5 hidden sm:block">
            <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-gold/60 via-white/15 to-sky-400/40 shadow-2xl shadow-black/60">
              <div className="vibe-glass rounded-3xl p-6 space-y-5">
                <div className="relative h-44 rounded-2xl overflow-hidden border border-white/10">
                  <img
                    src={`${baseUrl}images/tools-scissors.jpg`}
                    alt="Tesouras douradas e navalha da Vibe Barber"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <Badge tone="gold">
                      <Flame className="w-3 h-3" /> Experiência Underground
                    </Badge>
                    <span className="text-xs font-mono text-ink font-bold">SP • BRASIL</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                    <div className="p-2 rounded-lg bg-gold/15 text-gold">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-ink">Cadeira 100% Garantida</div>
                      <div className="text-xs text-ink-muted">Sinal Pix elimina faltas e atrasos</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                    <div className="p-2 rounded-lg bg-info/15 text-info">
                      <Repeat className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-ink">Repasse &amp; Troca Inteligente</div>
                      <div className="text-xs text-ink-muted">Imprevisto? Repasse sua vaga e recupere o sinal</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ANIMATED MARQUEE TICKER */}
      <div className="border-y border-white/10 bg-gradient-to-r from-obsidian via-surface/90 to-obsidian py-3.5 marquee-wrap">
        <div className="marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-3 text-xs font-extrabold tracking-[0.2em] text-gold-light/90 whitespace-nowrap"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-gold" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 space-y-16">
        {/* VISUAL ATMOSPHERE SHOWCASE */}
        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gold font-bold">Atmosfera</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink mt-1">
                Precisão em cada detalhe
              </h2>
            </div>
            <Link to="/agendar" className="text-sm font-semibold text-gold hover:underline">
              Garantir meu horário →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {showcaseCards.map((item) => (
              <div
                key={item.title}
                className="group relative h-72 rounded-2xl overflow-hidden border border-white/10 hover:border-gold/50 transition-all duration-300 shadow-2xl shadow-black/50"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className={`absolute inset-0 bg-gradient-to-t ${item.accent}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/45 to-transparent" />
                <div className="absolute top-4 left-4">
                  <Badge tone="gold">{item.tag}</Badge>
                </div>
                <div className="absolute bottom-4 left-4 right-4 space-y-1">
                  <h3 className="text-lg font-extrabold text-ink group-hover:text-gold-light transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-ink-muted leading-relaxed">{item.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SERVIÇOS */}
        <section id="servicos" className="space-y-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gold font-bold">Catálogo</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink mt-1">Nossos Serviços</h2>
            </div>
            <Link to="/agendar" className="text-sm font-semibold text-gold hover:underline">
              Combinar múltiplos serviços →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeServices.map((srv) => (
              <Card
                key={srv.id}
                className="group flex flex-col justify-between gap-4 hover:-translate-y-1 hover:shadow-gold/10"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <Badge tone="gold">{srv.category}</Badge>
                    <span className="font-mono text-lg font-extrabold text-gold-gradient">
                      {formatBRL(srv.priceCents)}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-ink group-hover:text-gold-light transition-colors">
                    {srv.name}
                  </h3>
                  <p className="text-sm text-ink-muted mt-1">{srv.description}</p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                  <span className="text-xs text-ink-muted inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gold" /> {srv.durationMinutes} min
                  </span>
                  <Link to={`/agendar?service=${srv.id}`}>
                    <Button size="sm" variant="primary">
                      Selecionar
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* EQUIPE */}
        <section id="equipe" className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold font-bold">Profissionais</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink mt-1">Nossa Equipe</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {activeBarbers.map((barber) => (
              <Card key={barber.id} className="space-y-4 hover:-translate-y-1">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-deep font-extrabold text-lg shrink-0 shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${barber.avatarColor}, #ffffff)`,
                    }}
                  >
                    {barber.avatarInitials}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-ink">{barber.displayName}</h3>
                    <div className="text-xs text-gold inline-flex items-center gap-1 font-semibold mt-0.5">
                      <Star className="w-3.5 h-3.5 fill-gold" /> {barber.rating.toFixed(1)} • Especialista
                    </div>
                  </div>
                </div>
                <p className="text-sm text-ink-muted leading-relaxed">{barber.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {barber.specialties.map((spec) => (
                    <Badge key={spec} tone="muted">{spec}</Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* BANNER FINAL CTA COM BACKGROUND DE BARBOTERAPIA */}
        <section className="relative overflow-hidden rounded-3xl border border-gold/30 p-8 sm:p-12 shadow-2xl">
          <img
            src={`${baseUrl}images/beard-ritual.jpg`}
            alt="Ritual de barboterapia na Vibe Barber"
            className="absolute inset-0 w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/85 to-amber-900/40" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-xl space-y-2">
              <Badge tone="gold">Agenda Aberta Agora</Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">
                Pronto para elevar o nível do seu visual?
              </h2>
              <p className="text-sm text-ink-muted">
                Reserve em menos de 1 minuto com sinal via Pix e conte com mural de repasse caso
                surja algum imprevisto.
              </p>
            </div>
            <Link to="/agendar">
              <Button size="lg" variant="primary" className="px-8 py-4 text-base">
                <Scissors className="w-4 h-4" /> Reservar Horário
              </Button>
            </Link>
          </div>
        </section>

        {/* INFORMAÇÕES & POLÍTICA */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="space-y-3">
            <h3 className="text-lg font-bold text-ink">Onde estamos e Horários</h3>
            <div className="space-y-2.5 text-sm text-ink-muted">
              <p className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-gold shrink-0" /> {state.barbershop.address}
              </p>
              <p className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-gold shrink-0" /> {state.barbershop.openingHoursText}
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-gold shrink-0" /> {state.barbershop.phone}
              </p>
              <p className="flex items-center gap-2.5">
                <Instagram className="w-4 h-4 text-gold shrink-0" /> {state.barbershop.instagram}
              </p>
            </div>
          </Card>

          <Card className="space-y-3">
            <h3 className="text-lg font-bold text-ink">Política de Sinal e Cancelamento</h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              {state.settings.cancellationPolicyText}
            </p>
            <div className="flex flex-wrap gap-4 pt-1 text-xs">
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
    </div>
  );
}
