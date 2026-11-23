/* ==========================================================================
   BarberSync — Store & Seed Data (localStorage persistence)
   ========================================================================== */

(function (global) {
  const STORAGE_KEY = 'vibebarber_state_v1';

  const TIME_SLOTS = [
    '09:00', '10:00', '11:00',
    '13:00', '14:00', '15:00',
    '16:00', '17:00', '18:00', '19:00'
  ];

  function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function addDays(baseDate, days) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    d.setDate(d.getDate() + days);
    return d;
  }

  function getUpcomingDates(count = 7) {
    const today = new Date();
    const dowNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const monthNames = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const list = [];
    for (let i = 0; i < count; i++) {
      const d = addDays(today, i);
      list.push({
        iso: toISODate(d),
        day: String(d.getDate()).padStart(2, '0'),
        month: monthNames[d.getMonth()],
        dow: i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : dowNames[d.getDay()],
        fullLabel: i === 0
          ? `Hoje, ${d.getDate()} de ${monthNames[d.getMonth()]}`
          : i === 1
            ? `Amanhã, ${d.getDate()} de ${monthNames[d.getMonth()]}`
            : `${dowNames[d.getDay()]}, ${d.getDate()} de ${monthNames[d.getMonth()]}`
      });
    }
    return list;
  }

  function createSeedState() {
    const today = new Date();
    const d0 = toISODate(addDays(today, 0));
    const d1 = toISODate(addDays(today, 1));
    const d2 = toISODate(addDays(today, 2));

    return {
      settings: {
        shopName: 'Vibe Barber',
        depositAmount: 10,
        pixKey: 'pagamentos@vibebarber.com.br',
        pixReceiver: 'VIBE BARBER STUDIO',
        city: 'SAO PAULO'
      },
      services: [
        { id: 'corte', name: 'Corte Degradê / Social', duration: 45, price: 45, desc: 'Acabamento na navalha e lavagem' },
        { id: 'barba', name: 'Barba Navalhada', duration: 30, price: 30, desc: 'Toalha quente e óleo hidratante' },
        { id: 'combo', name: 'Corte + Barba', duration: 60, price: 65, desc: 'Combo completo com sobrancelha grátis' },
        { id: 'sobrancelha', name: 'Sobrancelha na Navalha', duration: 15, price: 15, desc: 'Alinhamento limpo e natural' }
      ],
      barbers: [
        { id: 'carlos', name: 'Carlos "Navalha"', specialty: 'Degradê & Navalhado', color: '#E8B04B', initials: 'CN', rating: '4.9' },
        { id: 'diego', name: 'Diego Fade', specialty: 'Freestyle & Barba', color: '#38BDF8', initials: 'DF', rating: '4.8' },
        { id: 'thiago', name: 'Thiago Classic', specialty: 'Tesoura & Social', color: '#4ADE80', initials: 'TC', rating: '5.0' }
      ],
      clients: [
        { id: 'cli_lucas', name: 'Lucas Mendes', phone: '(11) 98412-3310' },
        { id: 'cli_rafael', name: 'Rafael Souza', phone: '(11) 97220-8841' },
        { id: 'cli_matheus', name: 'Matheus Oliveira', phone: '(11) 99104-5529' },
        { id: 'cli_bruno', name: 'Bruno Ferreira', phone: '(11) 96531-1902' }
      ],
      activeClientId: 'cli_lucas',
      bookings: [
        {
          id: 'bk_101',
          code: 'VB-4821',
          date: d0,
          time: '10:00',
          barberId: 'carlos',
          serviceId: 'combo',
          clientId: 'cli_lucas',
          clientName: 'Lucas Mendes',
          clientPhone: '(11) 98412-3310',
          price: 65,
          deposit: 10,
          status: 'confirmed',
          transferOffer: false,
          transferNote: '',
          createdAt: Date.now() - 3600000 * 5
        },
        {
          id: 'bk_102',
          code: 'VB-4822',
          date: d0,
          time: '15:00',
          barberId: 'carlos',
          serviceId: 'corte',
          clientId: 'cli_rafael',
          clientName: 'Rafael Souza',
          clientPhone: '(11) 97220-8841',
          price: 45,
          deposit: 10,
          status: 'confirmed',
          transferOffer: false,
          transferNote: '',
          createdAt: Date.now() - 3600000 * 4
        },
        {
          id: 'bk_103',
          code: 'VB-4825',
          date: d0,
          time: '17:00',
          barberId: 'carlos',
          serviceId: 'corte',
          clientId: 'cli_matheus',
          clientName: 'Matheus Oliveira',
          clientPhone: '(11) 99104-5529',
          price: 45,
          deposit: 10,
          status: 'confirmed',
          transferOffer: true,
          transferNote: 'Surgiu um imprevisto no trabalho, passo minha vaga!',
          createdAt: Date.now() - 3600000 * 3
        },
        {
          id: 'bk_104',
          code: 'VB-4830',
          date: d0,
          time: '11:00',
          barberId: 'diego',
          serviceId: 'barba',
          clientId: 'cli_bruno',
          clientName: 'Bruno Ferreira',
          clientPhone: '(11) 96531-1902',
          price: 30,
          deposit: 10,
          status: 'confirmed',
          transferOffer: false,
          transferNote: '',
          createdAt: Date.now() - 3600000 * 2
        },
        {
          id: 'bk_105',
          code: 'VB-4834',
          date: d1,
          time: '14:00',
          barberId: 'carlos',
          serviceId: 'combo',
          clientId: 'cli_rafael',
          clientName: 'Rafael Souza',
          clientPhone: '(11) 97220-8841',
          price: 65,
          deposit: 10,
          status: 'confirmed',
          transferOffer: true,
          transferNote: 'Vou viajar amanhã à tarde, quem quiser pode pegar.',
          createdAt: Date.now() - 3600000
        },
        {
          id: 'bk_106',
          code: 'VB-4839',
          date: d2,
          time: '16:00',
          barberId: 'thiago',
          serviceId: 'corte',
          clientId: 'cli_matheus',
          clientName: 'Matheus Oliveira',
          clientPhone: '(11) 99104-5529',
          price: 45,
          deposit: 10,
          status: 'confirmed',
          transferOffer: false,
          transferNote: '',
          createdAt: Date.now() - 1800000
        }
      ],
      blockedSlots: [
        { id: 'blk_1', date: d0, time: '13:00', barberId: 'carlos', reason: 'Almoço' }
      ],
      swapRequests: [
        {
          id: 'swp_1',
          fromBookingId: 'bk_102',
          toBookingId: 'bk_101',
          fromClientId: 'cli_rafael',
          toClientId: 'cli_lucas',
          note: 'Opa! Consegue trocar comigo? Preciso cortar de manhã hoje.',
          status: 'pending',
          createdAt: Date.now() - 900000
        }
      ],
      waitlist: [
        {
          id: 'wl_1',
          clientId: 'cli_bruno',
          clientName: 'Bruno Ferreira',
          clientPhone: '(11) 96531-1902',
          date: d0,
          period: 'Tarde (13h - 19h)',
          barberId: 'carlos',
          createdAt: Date.now() - 2400000
        }
      ],
      activityLog: [
        {
          id: 'act_1',
          type: 'transfer_listed',
          text: 'Matheus Oliveira colocou o horário de hoje às 17:00 para repasse.',
          createdAt: Date.now() - 3000000
        },
        {
          id: 'act_2',
          type: 'swap_proposed',
          text: 'Rafael Souza propôs troca (15:00 ↔ 10:00) com Lucas Mendes.',
          createdAt: Date.now() - 900000
        }
      ],
      metrics: {
        savedSlotsCount: 2
      }
    };
  }

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createSeedState();
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.settings || !Array.isArray(parsed.bookings)) {
        return createSeedState();
      }
      return parsed;
    } catch (e) {
      return createSeedState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Não foi possível salvar no localStorage:', e);
    }
  }

  function resetDemoData() {
    state = createSeedState();
    saveState();
    return state;
  }

  function getState() {
    return state;
  }

  function getActiveClient() {
    return state.clients.find((c) => c.id === state.activeClientId) || state.clients[0];
  }

  function setActiveClient(clientId) {
    if (state.clients.some((c) => c.id === clientId)) {
      state.activeClientId = clientId;
      saveState();
    }
  }

  function addCustomClient(name, phone) {
    const cleanName = name.trim();
    const cleanPhone = phone.trim() || '(11) 99999-0000';
    if (!cleanName) return null;
    const newClient = {
      id: 'cli_' + Date.now(),
      name: cleanName,
      phone: cleanPhone
    };
    state.clients.push(newClient);
    state.activeClientId = newClient.id;
    saveState();
    return newClient;
  }

  function updateSettings(partial) {
    state.settings = { ...state.settings, ...partial };
    saveState();
  }

  function logActivity(type, text) {
    state.activityLog.unshift({
      id: 'act_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      type,
      text,
      createdAt: Date.now()
    });
    if (state.activityLog.length > 30) {
      state.activityLog.length = 30;
    }
    saveState();
  }

  global.BarberSync = global.BarberSync || {};
  global.BarberSync.TIME_SLOTS = TIME_SLOTS;
  global.BarberSync.Store = {
    getState,
    saveState,
    resetDemoData,
    getUpcomingDates,
    getActiveClient,
    setActiveClient,
    addCustomClient,
    updateSettings,
    logActivity
  };
})(window);
