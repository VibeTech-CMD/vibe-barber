import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import type { UserRole } from '@/types/domain';
import { useVibeStore } from '@/services/vibeStore';
import { PublicLayout } from '@/app/layout/PublicLayout';
import { HomePage } from '@/pages/public/HomePage';
import { BookingPage } from '@/pages/public/BookingPage';
import { PolicyPage } from '@/pages/public/PolicyPage';
import { ClientBookingsPage } from '@/pages/client/ClientBookingsPage';
import { TransfersAndWaitlistPage } from '@/pages/client/TransfersAndWaitlistPage';
import { BarberDashboardPage } from '@/pages/barber/BarberDashboardPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { Button, Card } from '@/components/ui/primitives';

function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const { activeProfile, state, setActiveProfile } = useVibeStore();

  if (!allowedRoles.includes(activeProfile.role)) {
    const matchingDemo = state.profiles.find((p) => allowedRoles.includes(p.role));
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <Card className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-alert/15 text-alert flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-ink">Acesso restrito ao perfil autorizado</h2>
          <p className="text-sm text-ink-muted">
            Esta área exige perfil <strong>{allowedRoles.join(' ou ')}</strong>. No Modo Demo, você
            pode alternar o perfil no topo ou clicar abaixo.
          </p>
          {matchingDemo && (
            <Button variant="primary" onClick={() => setActiveProfile(matchingDemo.id)}>
              Entrar como {matchingDemo.fullName}
            </Button>
          )}
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

export function AppRouter() {
  return (
    <HashRouter>
      <PublicLayout>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/servicos" element={<HomePage />} />
          <Route path="/equipe" element={<HomePage />} />
          <Route path="/agendar" element={<BookingPage />} />
          <Route path="/agendar/confirmacao" element={<ClientBookingsPage />} />
          <Route path="/politica" element={<PolicyPage />} />
          <Route path="/privacidade" element={<PolicyPage />} />

          {/* Client Routes */}
          <Route path="/cliente" element={<Navigate to="/cliente/agendamentos" replace />} />
          <Route path="/cliente/agendamentos" element={<ClientBookingsPage />} />
          <Route path="/cliente/historico" element={<ClientBookingsPage />} />
          <Route path="/cliente/repasses" element={<TransfersAndWaitlistPage />} />
          <Route path="/cliente/fila" element={<TransfersAndWaitlistPage />} />

          {/* Barber Protected Routes */}
          <Route
            path="/barbeiro/*"
            element={
              <ProtectedRoute allowedRoles={['barber', 'admin']}>
                <BarberDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Protected Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PublicLayout>
    </HashRouter>
  );
}
