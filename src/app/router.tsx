import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useVibeStore } from '@/services/vibeStore';
import { PublicLayout } from '@/app/layout/PublicLayout';
import { HomePage } from '@/pages/public/HomePage';
import { BookingPage } from '@/pages/public/BookingPage';
import { PolicyPage } from '@/pages/public/PolicyPage';
import { MasterLoginPage } from '@/pages/public/MasterLoginPage';
import { ClientBookingsPage } from '@/pages/client/ClientBookingsPage';
import { TransfersAndWaitlistPage } from '@/pages/client/TransfersAndWaitlistPage';
import { BarberDashboardPage } from '@/pages/barber/BarberDashboardPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';

function MasterProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state } = useVibeStore();
  if (!state.masterAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <HashRouter>
      <PublicLayout>
        <Routes>
          {/* Public & Client Routes (Zero Login Required) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/servicos" element={<HomePage />} />
          <Route path="/equipe" element={<HomePage />} />
          <Route path="/agendar" element={<BookingPage />} />
          <Route path="/agendar/confirmacao" element={<ClientBookingsPage />} />
          <Route path="/politica" element={<PolicyPage />} />
          <Route path="/privacidade" element={<PolicyPage />} />
          <Route path="/login" element={<MasterLoginPage />} />

          {/* Client Self-Service Routes (Identified by CPF) */}
          <Route path="/cliente" element={<Navigate to="/cliente/agendamentos" replace />} />
          <Route path="/cliente/agendamentos" element={<ClientBookingsPage />} />
          <Route path="/cliente/historico" element={<ClientBookingsPage />} />
          <Route path="/cliente/repasses" element={<TransfersAndWaitlistPage />} />
          <Route path="/cliente/fila" element={<TransfersAndWaitlistPage />} />

          {/* Master Protected Routes */}
          <Route
            path="/barbeiro/*"
            element={
              <MasterProtectedRoute>
                <BarberDashboardPage />
              </MasterProtectedRoute>
            }
          />
          <Route
            path="/admin/*"
            element={
              <MasterProtectedRoute>
                <AdminDashboardPage />
              </MasterProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PublicLayout>
    </HashRouter>
  );
}
