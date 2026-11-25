import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarCheck,
  CalendarPlus,
  CheckCheck,
  Home,
  Lock,
  LogOut,
  Repeat,
  Scissors,
  Shield,
} from 'lucide-react';
import { BRAND_CONFIG } from '@/config/brand';
import { useVibeStore } from '@/services/vibeStore';
import { VibetechFooter } from '@/components/common/VibetechFooter';
import { ScissorCursor } from '@/components/common/ScissorCursor';
import { Badge, Button, Modal, useToast } from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const {
    state,
    unreadNotificationsCount,
    logoutMaster,
    markNotificationRead,
    markAllNotificationsRead,
  } = useVibeStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);

  const isMaster = state.masterAuthenticated;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'px-3 py-2 rounded-xl text-sm font-medium transition-colors',
      isActive
        ? 'bg-gold/15 text-gold-light border border-gold/30'
        : 'text-ink-muted hover:text-ink hover:bg-white/5'
    );

  const handleLogout = () => {
    logoutMaster();
    toast('Você saiu do Painel Master.', 'info');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col text-ink relative">
      {/* Custom Interactive Scissors Mouse Cursor (Desktop) */}
      <ScissorCursor />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-obsidian/90 backdrop-blur-md border-b border-white/[0.08]">
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
                {BRAND_CONFIG.appName}
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Navegação principal">
            <NavLink to="/" end className={navLinkClass}>Início</NavLink>
            <NavLink to="/agendar" className={navLinkClass}>Agendar Corte</NavLink>
            <NavLink to="/cliente/agendamentos" className={navLinkClass}>Meus Horários</NavLink>
            <NavLink to="/cliente/repasses" className={navLinkClass}>Repasses &amp; Fila</NavLink>
            {isMaster && (
              <NavLink to="/admin" className={navLinkClass}>Painel do Dono</NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {isMaster ? (
              <>
                <button
                  type="button"
                  onClick={() => setNotifOpen(true)}
                  aria-label="Notificações do Master"
                  className="relative p-2 rounded-xl bg-surface2 border border-white/15 text-ink hover:border-gold/50 transition-colors"
                >
                  <Bell className="w-4 h-4 text-gold-light" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-alert text-white text-[10px] font-extrabold flex items-center justify-center">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>
                <Link
                  to="/admin"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold/15 border border-gold/30 text-gold-light text-xs font-bold"
                >
                  <Shield className="w-3.5 h-3.5" /> Master
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sair do modo Master"
                  className="p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-white/5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-ink-muted hover:text-ink border border-white/10 hover:border-gold/40 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5 text-gold" /> Área do Dono
                </Link>
                <Link
                  to="/agendar"
                  className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-gold text-deep text-xs sm:text-sm font-bold hover:bg-gold-light transition-colors"
                >
                  Agendar agora
                </Link>
              </>
            )}
          </div>
        </div>
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
          <span>Horários</span>
        </NavLink>
        <NavLink
          to={isMaster ? '/admin' : '/cliente/repasses'}
          className={({ isActive }) =>
            cn('flex flex-col items-center justify-center gap-1 text-[11px] font-semibold', isActive ? 'text-gold-light' : 'text-ink-muted')
          }
        >
          {isMaster ? (
            <>
              <Shield className="w-5 h-5" />
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

      {/* Master-Only Notifications Modal */}
      <Modal
        open={notifOpen}
        title="Notificações do Dono (Master)"
        onClose={() => setNotifOpen(false)}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>Alertas exclusivos do proprietário da barbearia</span>
            {unreadNotificationsCount > 0 && (
              <Button size="sm" variant="ghost" onClick={markAllNotificationsRead}>
                <CheckCheck className="w-3.5 h-3.5" /> Marcar lidas
              </Button>
            )}
          </div>

          {state.masterNotifications.length === 0 ? (
            <p className="text-sm text-ink-muted py-6 text-center">
              Nenhuma notificação por enquanto.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {state.masterNotifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markNotificationRead(n.id)}
                  className={cn(
                    'w-full text-left p-3.5 rounded-xl border transition-colors',
                    n.read
                      ? 'bg-deep/50 border-white/5 opacity-75'
                      : 'bg-deep border-gold/35'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-bold text-ink">{n.title}</span>
                    {!n.read && <Badge tone={n.tone}>Nova</Badge>}
                  </div>
                  <p className="text-xs text-ink-muted">{n.message}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
