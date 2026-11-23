import React from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  CalendarPlus,
  Home,
  LayoutDashboard,
  Repeat,
  Scissors,
  Shield,
  Users,
} from 'lucide-react';
import { BRAND_CONFIG } from '@/config/brand';
import { useVibeStore } from '@/services/vibeStore';
import { VibetechFooter } from '@/components/common/VibetechFooter';
import { ScissorCursor } from '@/components/common/ScissorCursor';
import { Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { state, activeProfile, setActiveProfile } = useVibeStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleProfileChange = (profileId: string) => {
    setActiveProfile(profileId);
    const next = state.profiles.find((p) => p.id === profileId);
    if (next?.role === 'admin' && !location.pathname.startsWith('/admin')) {
      navigate('/admin');
    } else if (next?.role === 'barber' && !location.pathname.startsWith('/barbeiro')) {
      navigate('/barbeiro');
    } else if (next?.role === 'client' && (location.pathname.startsWith('/admin') || location.pathname.startsWith('/barbeiro'))) {
      navigate('/cliente/agendamentos');
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'px-3 py-2 rounded-xl text-sm font-medium transition-colors',
      isActive
        ? 'bg-gold/15 text-gold-light border border-gold/30'
        : 'text-ink-muted hover:text-ink hover:bg-white/5'
    );

  return (
    <div className="min-h-screen flex flex-col bg-vibe-grid text-ink relative">
      {/* Custom Interactive Scissors Mouse Cursor (Desktop) */}
      <ScissorCursor />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-obsidian/80 backdrop-blur-xl border-b border-white/[0.09]">
        <div className="barber-pole-strip w-full" aria-hidden="true" />
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-light to-gold-dark flex items-center justify-center text-deep font-extrabold shadow-md shadow-gold/20 shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-extrabold tracking-tight text-ink truncate">
                {state.barbershop.name}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">
                Vibe Barber • {BRAND_CONFIG.developerName}
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Navegação principal">
            <NavLink to="/" end className={navLinkClass}>Início</NavLink>
            <NavLink to="/agendar" className={navLinkClass}>Agendar</NavLink>
            <NavLink to="/cliente/agendamentos" className={navLinkClass}>Meus Horários</NavLink>
            <NavLink to="/cliente/repasses" className={navLinkClass}>Repasses &amp; Fila</NavLink>
            {activeProfile.role === 'barber' && (
              <NavLink to="/barbeiro" className={navLinkClass}>Painel Barbeiro</NavLink>
            )}
            {activeProfile.role === 'admin' && (
              <NavLink to="/admin" className={navLinkClass}>Painel Admin</NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {activeProfile.role === 'admin' ? (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold/15 border border-gold/30 text-gold-light text-xs font-semibold"
              >
                <Shield className="w-3.5 h-3.5" /> Admin
              </Link>
            ) : activeProfile.role === 'barber' ? (
              <Link
                to="/barbeiro"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-info/15 border border-info/30 text-sky-300 text-xs font-semibold"
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Barbeiro
              </Link>
            ) : (
              <Link
                to="/agendar"
                className="px-3.5 py-2 rounded-xl bg-gold text-deep text-xs sm:text-sm font-bold hover:bg-gold-light transition-colors"
              >
                Agendar agora
              </Link>
            )}
          </div>
        </div>

        {/* Demo Profile Switcher Bar (PRD Section 23.2 — clearly marked as demo only) */}
        {BRAND_CONFIG.demoMode && (
          <div className="bg-surface/90 border-t border-white/[0.06]">
            <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone="gold">MODO DEMO</Badge>
                <label htmlFor="demoProfileSelect" className="text-ink-muted">
                  Perfil ativo:
                </label>
                <select
                  id="demoProfileSelect"
                  value={activeProfile.id}
                  onChange={(e) => handleProfileChange(e.target.value)}
                  className="bg-deep border border-white/15 rounded-lg px-2.5 py-1 text-xs font-semibold text-ink focus:outline-none focus:border-gold"
                >
                  {state.profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.role === 'admin' ? 'Admin' : p.role === 'barber' ? 'Barbeiro' : 'Cliente'})
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-ink-dim hidden sm:inline">
                Alternador exclusivo do modo demonstração para validar fluxos de cliente, barbeiro e admin.
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-6">{children}</main>

      {/* Mandatory Vibetech Footer */}
      <VibetechFooter />

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-white/10 grid grid-cols-4 h-16 px-1"
        aria-label="Navegação mobile"
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn('flex flex-col items-center justify-center gap-1 text-[11px] font-semibold', isActive ? 'text-gold-light' : 'text-ink-muted')
          }
        >
          <Home className="w-5 h-5" />
          <span>Início</span>
        </NavLink>
        <NavLink
          to="/agendar"
          className={({ isActive }) =>
            cn('flex flex-col items-center justify-center gap-1 text-[11px] font-semibold', isActive ? 'text-gold-light' : 'text-ink-muted')
          }
        >
          <CalendarPlus className="w-5 h-5" />
          <span>Agendar</span>
        </NavLink>
        <NavLink
          to="/cliente/agendamentos"
          className={({ isActive }) =>
            cn('flex flex-col items-center justify-center gap-1 text-[11px] font-semibold', isActive ? 'text-gold-light' : 'text-ink-muted')
          }
        >
          <CalendarCheck className="w-5 h-5" />
          <span>Reservas</span>
        </NavLink>
        <NavLink
          to={activeProfile.role === 'admin' ? '/admin' : activeProfile.role === 'barber' ? '/barbeiro' : '/cliente/repasses'}
          className={({ isActive }) =>
            cn('flex flex-col items-center justify-center gap-1 text-[11px] font-semibold', isActive ? 'text-gold-light' : 'text-ink-muted')
          }
        >
          {activeProfile.role === 'admin' || activeProfile.role === 'barber' ? (
            <>
              <Users className="w-5 h-5" />
              <span>Painel</span>
            </>
          ) : (
            <>
              <Repeat className="w-5 h-5" />
              <span>Repasses</span>
            </>
          )}
        </NavLink>
      </nav>
    </div>
  );
}
