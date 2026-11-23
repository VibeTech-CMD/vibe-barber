import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  Instagram,
  MapPin,
  Phone,
  Scissors,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { useVibeStore } from '@/services/vibeStore';
import { formatBRL } from '@/config/brand';
import { Badge, Button, Card } from '@/components/ui/primitives';

export function HomePage() {
  const { state } = useVibeStore();
  const activeServices = state.services.filter((s) => s.active);
  const activeBarbers = state.barbers.filter((b) => b.active);
  const baseUrl = import.meta.env.BASE_URL;

  return (
    <div className="space-y-14">
      {/* HERO DIRETO E LIMPO COM FOTO DE BARBEARIA */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <img
            src={`${baseUrl}images/hero-barber.jpg`}
            alt="Barbeiro realizando corte na Vibe Barber"
            className="w-full h-full object-cover object-center opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#090A0D] via-[#090A0D]/85 to-[#090A0D]/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090A0D] via-transparent to-[#090A0D]/60" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 py-14 sm:py-20 space-y-8">
          <div className="max-w-2xl space-y-5">
            <Badge tone="gold">
              Sinal via Pix de {formatBRL(state.settings.fixedDepositCents)} • Abatido no valor do corte
            </Badge>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-ink">
              Marque seu corte em segundos,{' '}
              <span className="text-gold-gradient">sem esperar no WhatsApp.</span>
            </h1>

            <p className="text-base sm:text-lg text-ink-muted leading-relaxed">
              Veja os horários livres de verdade, escolha seu barbeiro e garanta sua cadeira na
              hora. Simples, rápido e sem erro.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link to="/agendar">
                <Button size="lg" variant="primary" className="px-7 py-3.5 text-base">
                  <Scissors className="w-4 h-4" /> Agendar meu horário <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="#servicos">
                <Button size="lg" variant="outline" className="px-6 py-3.5 text-base">
                  Ver preços
                </Button>
              </a>
            </div>
          </div>

          {/* 3 PASSOS SIMPLES (ANTI-ERRO) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
            <div className="rounded-2xl bg-surface/80 backdrop-blur-md border border-white/10 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gold/15 text-gold font-extrabold flex items-center justify-center shrink-0">
                1
              </div>
              <div>
                <div className="text-sm font-bold text-ink">Escolha o serviço</div>
                <div className="text-xs text-ink-muted">Corte, barba ou combo</div>
              </div>
            </div>
            <div className="rounded-2xl bg-surface/80 backdrop-blur-md border border-white/10 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gold/15 text-gold font-extrabold flex items-center justify-center shrink-0">
                2
              </div>
              <div>
                <div className="text-sm font-bold text-ink">Escolha o dia e hora</div>
                <div className="text-xs text-ink-muted">Só aparecem vagas livres</div>
              </div>
            </div>
            <div className="rounded-2xl bg-surface/80 backdrop-blur-md border border-white/10 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-confirm/15 text-confirm font-extrabold flex items-center justify-center shrink-0">
                3
              </div>
              <div>
                <div className="text-sm font-bold text-ink">Confirme com o sinal</div>
                <div className="text-xs text-ink-muted">Pix de {formatBRL(state.settings.fixedDepositCents)} garante a vaga</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 space-y-14">
        {/* SERVIÇOS E PREÇOS (CLIQUE DIRETO PARA AGENDAR) */}
        <section id="servicos" className="space-y-5">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-extrabold text-ink">Serviços e Preços</h2>
              <p className="text-sm text-ink-muted mt-0.5">
                Clique em qualquer serviço para ir direto ao agendamento.
              </p>
            </div>
            <Link to="/agendar" className="text-sm font-semibold text-gold hover:underline">
              Agendar mais de um serviço →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeServices.map((srv) => (
              <Card key={srv.id} className="flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-ink-muted">{srv.category}</span>
                    <span className="font-mono text-lg font-extrabold text-gold-light">
                      {formatBRL(srv.priceCents)}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-ink">{srv.name}</h3>
                  <p className="text-sm text-ink-muted mt-1">{srv.description}</p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                  <span className="text-xs text-ink-muted inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gold" /> {srv.durationMinutes} min
                  </span>
                  <Link to={`/agendar?service=${srv.id}`}>
                    <Button size="sm" variant="primary">
                      Agendar este
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* GALERIA DA BARBEARIA (LIMPA E AUTÊNTICA) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Corte & Degradê', img: `${baseUrl}images/hero-barber.jpg` },
            { title: 'Acabamento na Navalha', img: `${baseUrl}images/tools-scissors.jpg` },
            { title: 'Barba & Toalha Quente', img: `${baseUrl}images/beard-ritual.jpg` },
          ].map((item) => (
            <div
              key={item.title}
              className="group relative h-52 rounded-2xl overflow-hidden border border-white/10"
            >
              <img
                src={item.img}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/20 to-transparent" />
              <div className="absolute bottom-3.5 left-4 font-bold text-sm text-ink">
                {item.title}
              </div>
            </div>
          ))}
        </section>

        {/* EQUIPE */}
        <section id="equipe" className="space-y-5">
          <div>
            <h2 className="text-2xl font-extrabold text-ink">Nossos Barbeiros</h2>
            <p className="text-sm text-ink-muted mt-0.5">
              Escolha seu profissional preferido ou deixe o sistema achar o primeiro disponível.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeBarbers.map((barber) => (
              <Card key={barber.id} className="space-y-3">
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

        {/* BLOCO DE CONFIANÇA + ONDE ESTAMOS */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="space-y-3">
            <h3 className="text-lg font-bold text-ink">Endereço e Horários</h3>
            <div className="space-y-2 text-sm text-ink-muted">
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
            <h3 className="text-lg font-bold text-ink flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-gold" /> Como funciona o sinal e repasse
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed">
              {state.settings.cancellationPolicyText}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Link to="/agendar">
                <Button size="sm" variant="primary">
                  <CalendarCheck className="w-4 h-4" /> Agendar agora
                </Button>
              </Link>
              <Link to="/politica" className="text-xs text-gold font-semibold hover:underline">
                Ler política completa →
              </Link>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
