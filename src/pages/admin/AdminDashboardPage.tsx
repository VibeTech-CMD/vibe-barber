import { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Calendar,
  Download,
  Lock,
  Plus,
  RotateCcw,
  Scissors,
  Settings,
  Users,
} from 'lucide-react';
import { useVibeStore } from '@/services/vibeStore';
import { formatBRL, formatDateBR, getUpcomingDates } from '@/config/brand';
import { calculateFinancialSummary } from '@/features/availability/engine';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Select,
  useToast,
} from '@/components/ui/primitives';
import { cn } from '@/lib/utils/cn';

type AdminTab =
  | 'dashboard'
  | 'agenda'
  | 'services'
  | 'barbers'
  | 'crm'
  | 'finance'
  | 'activities'
  | 'settings';

export function AdminDashboardPage() {
  const {
    state,
    updateAppointmentStatus,
    cancelAppointment,
    addTimeBlock,
    removeTimeBlock,
    saveService,
    toggleServiceActive,
    saveBarber,
    toggleBarberActive,
    updateBarbershop,
    updateSettings,
    resetDemoData,
  } = useVibeStore();
  const { toast } = useToast();

  const dates = getUpcomingDates(14);
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [filterDate, setFilterDate] = useState(dates[0]?.iso || '');
  const [filterBarberId, setFilterBarberId] = useState<string>('all');

  // Block form
  const [blockBarber, setBlockBarber] = useState(state.barbers[0]?.id || '');
  const [blockStart, setBlockStart] = useState('14:00');
  const [blockEnd, setBlockEnd] = useState('15:00');
  const [blockReason, setBlockReason] = useState('Folga / Manutenção');

  // Service modal
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [srvName, setSrvName] = useState('');
  const [srvDesc, setSrvDesc] = useState('');
  const [srvCategory, setSrvCategory] = useState('Cabelo');
  const [srvDuration, setSrvDuration] = useState('45');
  const [srvPrice, setSrvPrice] = useState('50');
  const [srvDeposit, setSrvDeposit] = useState('10');

  // Barber modal
  const [barberModalOpen, setBarberModalOpen] = useState(false);
  const [brbName, setBrbName] = useState('');
  const [brbDesc, setBrbDesc] = useState('');
  const [brbSpecs, setBrbSpecs] = useState('Degradê, Barba');

  // Reset confirmation
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const summaryAll = useMemo(
    () => calculateFinancialSummary(state.appointments, state.transfers),
    [state.appointments, state.transfers]
  );

  const filteredAgenda = useMemo(
    () =>
      state.appointments
        .filter(
          (a) =>
            a.date === filterDate &&
            (filterBarberId === 'all' || a.barberId === filterBarberId)
        )
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [state.appointments, filterDate, filterBarberId]
  );

  // CRM aggregated from real appointments
  const crmCustomers = useMemo(() => {
    const map = new Map<
      string,
      { name: string; phone: string; totalCount: number; completedCount: number; noShowCount: number; totalSpentCents: number; lastDate: string }
    >();
    for (const appt of state.appointments) {
      const key = appt.customerPhone || appt.customerName;
      const prev = map.get(key) || {
        name: appt.customerName,
        phone: appt.customerPhone,
        totalCount: 0,
        completedCount: 0,
        noShowCount: 0,
        totalSpentCents: 0,
        lastDate: appt.date,
      };
      prev.totalCount += 1;
      if (appt.status === 'completed') {
        prev.completedCount += 1;
        prev.totalSpentCents += appt.totalPriceCents;
      } else if (appt.status === 'no_show') {
        prev.noShowCount += 1;
        prev.totalSpentCents += appt.depositCents;
      }
      if (appt.date > prev.lastDate) prev.lastDate = appt.date;
      map.set(key, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount);
  }, [state.appointments]);

  const handleExportCsv = () => {
    const headers = ['Codigo', 'Data', 'Horario', 'Cliente', 'Barbeiro', 'Status', 'Total_BRL', 'Sinal_BRL'];
    const rows = state.appointments.map((a) => {
      const b = state.barbers.find((x) => x.id === a.barberId)?.displayName || '';
      return [
        a.appointmentCode,
        a.date,
        a.startTime,
        `"${a.customerName}"`,
        `"${b}"`,
        a.status,
        (a.totalPriceCents / 100).toFixed(2),
        (a.depositCents / 100).toFixed(2),
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vibe-barber-financeiro-${filterDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast('Relatório CSV exportado!', 'success');
  };

  const handleCreateService = () => {
    if (!srvName.trim()) {
      toast('Informe o nome do serviço.', 'error');
      return;
    }
    saveService({
      name: srvName.trim(),
      description: srvDesc.trim() || 'Serviço profissional Vibe Barber.',
      category: srvCategory,
      durationMinutes: Math.max(15, Number(srvDuration) || 30),
      priceCents: Math.round((Number(srvPrice) || 40) * 100),
      bufferMinutes: 0,
      depositCents: Math.round((Number(srvDeposit) || 10) * 100),
      active: true,
    });
    toast(`Serviço "${srvName}" cadastrado!`, 'success');
    setSrvName('');
    setSrvDesc('');
    setServiceModalOpen(false);
  };

  const handleCreateBarber = () => {
    if (!brbName.trim()) {
      toast('Informe o nome do barbeiro.', 'error');
      return;
    }
    saveBarber({
      displayName: brbName.trim(),
      description: brbDesc.trim() || 'Profissional especialista da equipe Vibe Barber.',
      specialties: brbSpecs
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      active: true,
    });
    toast(`Barbeiro "${brbName}" cadastrado!`, 'success');
    setBrbName('');
    setBrbDesc('');
    setBarberModalOpen(false);
  };

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'agenda', label: 'Agenda', icon: <Calendar className="w-4 h-4" /> },
    { id: 'services', label: 'Serviços', icon: <Scissors className="w-4 h-4" /> },
    { id: 'barbers', label: 'Barbeiros', icon: <Users className="w-4 h-4" /> },
    { id: 'crm', label: 'Clientes (CRM)', icon: <Users className="w-4 h-4" /> },
    { id: 'finance', label: 'Financeiro', icon: <Download className="w-4 h-4" /> },
    { id: 'activities', label: 'Atividades', icon: <Activity className="w-4 h-4" /> },
    { id: 'settings', label: 'Configurações', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
        {/* Sidebar Navigation */}
        <aside className="bg-surface border border-white/[0.08] rounded-2xl p-3 flex lg:flex-col gap-1 overflow-x-auto lg:sticky lg:top-28">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors',
                tab === t.id
                  ? 'bg-gold/15 text-gold-light border border-gold/30'
                  : 'text-ink-muted hover:text-ink hover:bg-white/5'
              )}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <div className="space-y-6 min-w-0">
          {/* TAB: DASHBOARD */}
          {tab === 'dashboard' && (
            <>
              <div>
                <h1 className="text-2xl font-extrabold text-ink">Painel Administrativo</h1>
                <p className="text-sm text-ink-muted">Indicadores calculados em tempo real a partir da operação.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <div className="text-xs text-ink-muted">Receita Prevista</div>
                  <div className="text-xl font-extrabold font-mono text-gold-light mt-1">
                    {formatBRL(summaryAll.expectedRevenueCents)}
                  </div>
                  <div className="text-[11px] text-ink-dim">{summaryAll.confirmedCount} confirmados</div>
                </Card>
                <Card>
                  <div className="text-xs text-ink-muted">Receita Realizada</div>
                  <div className="text-xl font-extrabold font-mono text-confirm mt-1">
                    {formatBRL(summaryAll.realizedRevenueCents)}
                  </div>
                  <div className="text-[11px] text-ink-dim">{summaryAll.completedCount} concluídos</div>
                </Card>
                <Card>
                  <div className="text-xs text-ink-muted">Sinais Garantidos</div>
                  <div className="text-xl font-extrabold font-mono text-ink mt-1">
                    {formatBRL(summaryAll.depositsReceivedCents)}
                  </div>
                  <div className="text-[11px] text-ink-dim">Abatidos do valor total</div>
                </Card>
                <Card>
                  <div className="text-xs text-ink-muted">Vagas Recuperadas</div>
                  <div className="text-xl font-extrabold font-mono text-info mt-1">
                    {summaryAll.recoveredSlotsCount}
                  </div>
                  <div className="text-[11px] text-ink-dim">No-shows: {summaryAll.noShowCount}</div>
                </Card>
              </div>

              <Card className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-ink">Últimas Atividades</h2>
                  <Button size="sm" variant="ghost" onClick={() => setTab('activities')}>Ver todas</Button>
                </div>
                <div className="space-y-2">
                  {state.activityLogs.slice(0, 6).map((log) => (
                    <div key={log.id} className="text-sm bg-deep px-3.5 py-2.5 rounded-xl flex justify-between gap-3">
                      <span className="text-ink">{log.description}</span>
                      <span className="text-xs text-ink-dim shrink-0">{log.actorName}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* TAB: AGENDA */}
          {tab === 'agenda' && (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h1 className="text-2xl font-extrabold text-ink">Agenda &amp; Bloqueios</h1>
                <div className="flex gap-2 flex-wrap">
                  <Select className="w-48" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
                    {dates.map((d) => (
                      <option key={d.iso} value={d.iso}>{d.fullLabel}</option>
                    ))}
                  </Select>
                  <Select className="w-44" value={filterBarberId} onChange={(e) => setFilterBarberId(e.target.value)}>
                    <option value="all">Todos os barbeiros</option>
                    {state.barbers.map((b) => (
                      <option key={b.id} value={b.id}>{b.displayName}</option>
                    ))}
                  </Select>
                </div>
              </div>

              {filteredAgenda.length === 0 ? (
                <EmptyState title="Agenda livre neste filtro" description="Nenhum agendamento encontrado para a data/profissional selecionados." />
              ) : (
                <div className="space-y-3">
                  {filteredAgenda.map((appt) => {
                    const barber = state.barbers.find((b) => b.id === appt.barberId);
                    return (
                      <Card key={appt.id} className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-gold-light">{appt.startTime}–{appt.endTime}</span>
                            <strong className="text-ink">{appt.customerName}</strong>
                            <Badge tone={appt.status === 'confirmed' ? 'confirm' : appt.status === 'no_show' || appt.status === 'cancelled' ? 'alert' : 'muted'}>
                              {appt.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-ink-muted mt-1">
                            {appt.items.map((i) => i.serviceNameSnapshot).join(' + ')} • {barber?.displayName} • Total {formatBRL(appt.totalPriceCents)}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {appt.status === 'confirmed' && (
                            <>
                              <Button size="sm" variant="confirm" onClick={() => { updateAppointmentStatus(appt.id, 'completed'); toast('Atendimento concluído!', 'success'); }}>
                                Concluir
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => { updateAppointmentStatus(appt.id, 'no_show'); toast('No-show registrado.', 'error'); }}>
                                No-show
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { cancelAppointment(appt.id, 'Cancelamento administrativo'); toast('Reserva cancelada.', 'info'); }}>
                                Cancelar
                              </Button>
                            </>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              <Card className="space-y-3">
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <Lock className="w-4 h-4 text-gold" /> Criar Bloqueio em {formatDateBR(filterDate)}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  <Select value={blockBarber} onChange={(e) => setBlockBarber(e.target.value)}>
                    {state.barbers.map((b) => (
                      <option key={b.id} value={b.id}>{b.displayName}</option>
                    ))}
                  </Select>
                  <Input type="time" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} />
                  <Input type="time" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} />
                  <Input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Motivo" />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const r = addTimeBlock({ barberId: blockBarber, date: filterDate, startTime: blockStart, endTime: blockEnd, reason: blockReason });
                      toast(r.ok ? 'Horário bloqueado!' : r.error || 'Erro', r.ok ? 'success' : 'error');
                    }}
                  >
                    Bloquear
                  </Button>
                </div>
                {state.timeBlocks.filter((b) => b.date === filterDate).map((blk) => (
                  <div key={blk.id} className="flex items-center justify-between text-xs bg-deep px-3 py-2 rounded-xl">
                    <span>
                      <strong className="font-mono text-gold">{blk.startTime}–{blk.endTime}</strong> •{' '}
                      {state.barbers.find((b) => b.id === blk.barberId)?.displayName} — {blk.reason}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => removeTimeBlock(blk.id)}>Liberar</Button>
                  </div>
                ))}
              </Card>
            </>
          )}

          {/* TAB: SERVICES */}
          {tab === 'services' && (
            <>
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl font-extrabold text-ink">Gestão de Serviços</h1>
                <Button variant="primary" onClick={() => setServiceModalOpen(true)}>
                  <Plus className="w-4 h-4" /> Novo Serviço
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {state.services.map((srv) => (
                  <Card key={srv.id} className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-ink">{srv.name}</strong>
                        <Badge tone={srv.active ? 'confirm' : 'muted'}>{srv.active ? 'Ativo' : 'Inativo'}</Badge>
                      </div>
                      <p className="text-xs text-ink-muted mt-1">{srv.description}</p>
                      <p className="text-xs font-mono text-gold-light mt-2">
                        {formatBRL(srv.priceCents)} • {srv.durationMinutes} min • Sinal {formatBRL(srv.depositCents)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => toggleServiceActive(srv.id)}>
                      {srv.active ? 'Desativar' : 'Ativar'}
                    </Button>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* TAB: BARBERS */}
          {tab === 'barbers' && (
            <>
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl font-extrabold text-ink">Gestão de Barbeiros</h1>
                <Button variant="primary" onClick={() => setBarberModalOpen(true)}>
                  <Plus className="w-4 h-4" /> Novo Barbeiro
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {state.barbers.map((brb) => (
                  <Card key={brb.id} className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-ink">{brb.displayName}</strong>
                        <Badge tone={brb.active ? 'confirm' : 'muted'}>{brb.active ? 'Ativo' : 'Inativo'}</Badge>
                      </div>
                      <p className="text-xs text-ink-muted mt-1">{brb.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {brb.specialties.map((s) => (
                          <Badge key={s} tone="muted">{s}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => toggleBarberActive(brb.id)}>
                      {brb.active ? 'Desativar' : 'Ativar'}
                    </Button>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* TAB: CRM */}
          {tab === 'crm' && (
            <>
              <h1 className="text-2xl font-extrabold text-ink">CRM — Clientes ({crmCustomers.length})</h1>
              <div className="space-y-3">
                {crmCustomers.map((c) => (
                  <Card key={c.phone + c.name} className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="font-bold text-ink">{c.name}</div>
                      <p className="text-xs text-ink-muted">{c.phone} • Última visita: {formatDateBR(c.lastDate)}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <Badge tone="muted">{c.totalCount} reservas</Badge>
                      <Badge tone="confirm">{c.completedCount} concluídos</Badge>
                      {c.noShowCount > 0 && <Badge tone="alert">{c.noShowCount} faltas</Badge>}
                      <span className="font-mono font-bold text-gold-light">{formatBRL(c.totalSpentCents)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* TAB: FINANCE */}
          {tab === 'finance' && (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-extrabold text-ink">Financeiro</h1>
                  <p className="text-xs text-ink-muted">
                    Regra contábil: o sinal Pix faz parte do valor total do serviço e nunca é contabilizado em duplicidade.
                  </p>
                </div>
                <Button variant="primary" onClick={handleExportCsv}>
                  <Download className="w-4 h-4" /> Exportar CSV
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card>
                  <div className="text-xs text-ink-muted">Receita Realizada</div>
                  <div className="text-2xl font-extrabold font-mono text-confirm mt-1">{formatBRL(summaryAll.realizedRevenueCents)}</div>
                </Card>
                <Card>
                  <div className="text-xs text-ink-muted">Receita Prevista (Confirmados)</div>
                  <div className="text-2xl font-extrabold font-mono text-gold-light mt-1">{formatBRL(summaryAll.expectedRevenueCents)}</div>
                </Card>
                <Card>
                  <div className="text-xs text-ink-muted">Sinais Retidos (No-show)</div>
                  <div className="text-2xl font-extrabold font-mono text-alert mt-1">{formatBRL(summaryAll.retainedNoShowCents)}</div>
                </Card>
              </div>
            </>
          )}

          {/* TAB: ACTIVITIES */}
          {tab === 'activities' && (
            <>
              <h1 className="text-2xl font-extrabold text-ink">Feed de Atividades</h1>
              <div className="space-y-2">
                {state.activityLogs.map((log) => (
                  <Card key={log.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm text-ink">{log.description}</div>
                      <div className="text-xs text-ink-dim">{log.actorName} • {log.eventType}</div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* TAB: SETTINGS */}
          {tab === 'settings' && (
            <Card className="space-y-4">
              <h1 className="text-xl font-extrabold text-ink">Configurações da Barbearia &amp; Pix</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1">Nome da Barbearia</label>
                  <Input
                    value={state.barbershop.name}
                    onChange={(e) => updateBarbershop({ name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1">Chave Pix</label>
                  <Input
                    value={state.settings.pixKey}
                    onChange={(e) => updateSettings({ pixKey: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1">Valor do Sinal Fixo (R$)</label>
                  <Input
                    type="number"
                    min={0}
                    value={state.settings.fixedDepositCents / 100}
                    onChange={(e) =>
                      updateSettings({ fixedDepositCents: Math.max(0, Math.round(Number(e.target.value) * 100)) })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1">WhatsApp</label>
                  <Input
                    value={state.barbershop.phone}
                    onChange={(e) => updateBarbershop({ phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-white/10 flex justify-between items-center flex-wrap gap-3">
                <span className="text-xs text-ink-dim">Alterações são salvas automaticamente.</span>
                <Button variant="danger" onClick={() => setResetModalOpen(true)}>
                  <RotateCcw className="w-4 h-4" /> Resetar Dados de Demonstração
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Modal: New Service */}
      <Modal open={serviceModalOpen} title="Cadastrar Novo Serviço" onClose={() => setServiceModalOpen(false)}>
        <div className="space-y-3">
          <Input placeholder="Nome do serviço (ex: Platinado)" value={srvName} onChange={(e) => setSrvName(e.target.value)} />
          <Input placeholder="Descrição breve" value={srvDesc} onChange={(e) => setSrvDesc(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Categoria" value={srvCategory} onChange={(e) => setSrvCategory(e.target.value)} />
            <Input type="number" placeholder="Duração (min)" value={srvDuration} onChange={(e) => setSrvDuration(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" placeholder="Preço (R$)" value={srvPrice} onChange={(e) => setSrvPrice(e.target.value)} />
            <Input type="number" placeholder="Sinal Pix (R$)" value={srvDeposit} onChange={(e) => setSrvDeposit(e.target.value)} />
          </div>
          <Button variant="primary" className="w-full" onClick={handleCreateService}>Salvar Serviço</Button>
        </div>
      </Modal>

      {/* Modal: New Barber */}
      <Modal open={barberModalOpen} title="Cadastrar Novo Barbeiro" onClose={() => setBarberModalOpen(false)}>
        <div className="space-y-3">
          <Input placeholder="Nome profissional" value={brbName} onChange={(e) => setBrbName(e.target.value)} />
          <Input placeholder="Descrição / Bio" value={brbDesc} onChange={(e) => setBrbDesc(e.target.value)} />
          <Input placeholder="Especialidades (separadas por vírgula)" value={brbSpecs} onChange={(e) => setBrbSpecs(e.target.value)} />
          <Button variant="primary" className="w-full" onClick={handleCreateBarber}>Salvar Barbeiro</Button>
        </div>
      </Modal>

      {/* Modal: Confirm Reset Demo */}
      <Modal open={resetModalOpen} title="Restaurar Dados de Demonstração?" onClose={() => setResetModalOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            Isso limpará todas as reservas, bloqueios e alterações feitas durante os testes e restaurará os dados iniciais de demonstração.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setResetModalOpen(false)}>Cancelar</Button>
            <Button
              variant="danger"
              onClick={() => {
                resetDemoData();
                setResetModalOpen(false);
                toast('Dados de demonstração restaurados!', 'success');
              }}
            >
              Confirmar Reset
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
