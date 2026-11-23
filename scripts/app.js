/* ==========================================================================
   BarberSync — Main UI Controller (Client PWA + Barber Dashboard)
   ========================================================================== */

(function (global) {
  const { Store, Pix, Scheduler, TIME_SLOTS } = global.BarberSync;

  const ui = {
    mode: 'client', // 'client' | 'barber'
    clientTab: 'book', // 'book' | 'bookings' | 'community'
    barberTab: 'agenda', // 'agenda' | 'feed' | 'settings'
    selectedServiceId: 'corte',
    selectedBarberId: 'carlos',
    selectedDate: Store.getUpcomingDates(7)[0].iso,
    selectedTime: null,
    barberFilterDate: Store.getUpcomingDates(7)[0].iso,
    barberFilterBarberId: 'carlos',
    pixTimerInterval: null
  };

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDateLabel(iso) {
    const dates = Store.getUpcomingDates(14);
    const match = dates.find((d) => d.iso === iso);
    if (match) return match.fullLabel;
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function timeAgo(ts) {
    const diffMin = Math.max(1, Math.floor((Date.now() - ts) / 60000));
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `há ${diffH}h`;
    return `há ${Math.floor(diffH / 24)}d`;
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.25s ease';
      setTimeout(() => el.remove(), 260);
    }, 3400);
  }

  function openModal(html) {
    const backdrop = document.getElementById('modalBackdrop');
    const sheet = document.getElementById('modalSheet');
    sheet.innerHTML = html;
    backdrop.classList.remove('hidden');
  }

  function closeModal() {
    if (ui.pixTimerInterval) {
      clearInterval(ui.pixTimerInterval);
      ui.pixTimerInterval = null;
    }
    document.getElementById('modalBackdrop').classList.add('hidden');
    document.getElementById('modalSheet').innerHTML = '';
  }

  function renderHeaderAndNav() {
    const state = Store.getState();
    const activeClient = Store.getActiveClient();

    document.getElementById('headerShopName').textContent = state.settings.shopName;
    document.getElementById('headerDepositSubtitle').textContent =
      `Sinal Pix ${Pix.formatCurrency(state.settings.depositAmount)} • Sem filas`;

    // Mode switch
    document.querySelectorAll('.mode-btn').forEach((btn) => {
      const active = btn.dataset.mode === ui.mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    // Identity bar & client nav visibility
    const isClient = ui.mode === 'client';
    document.getElementById('identityBar').classList.toggle('hidden', !isClient);
    document.getElementById('desktopClientTabs').classList.toggle('hidden', !isClient);
    document.getElementById('mobileClientNav').classList.toggle('hidden', !isClient);

    // Populate client switcher
    const switcher = document.getElementById('clientSwitcher');
    switcher.innerHTML = state.clients
      .map(
        (c) =>
          `<option value="${esc(c.id)}" ${c.id === activeClient.id ? 'selected' : ''}>${esc(c.name)}</option>`
      )
      .join('');

    // Tab active state
    document.querySelectorAll('[data-tab]').forEach((el) => {
      el.classList.toggle('active', el.dataset.tab === ui.clientTab);
    });

    // Badges
    const myPendingSwaps = state.swapRequests.filter(
      (s) => s.status === 'pending' && s.toClientId === activeClient.id
    ).length;
    const myActiveBookings = state.bookings.filter(
      (b) => b.clientId === activeClient.id && ['pending_pix', 'confirmed'].includes(b.status)
    ).length;
    const bookingsBadgeCount = myPendingSwaps > 0 ? myPendingSwaps : myActiveBookings;

    const transferCount = state.bookings.filter(
      (b) => b.status === 'confirmed' && b.transferOffer && b.clientId !== activeClient.id
    ).length;
    const communityBadgeCount = transferCount + myPendingSwaps;

    setBadge('desktopBadgeBookings', bookingsBadgeCount);
    setBadge('mobileBadgeBookings', bookingsBadgeCount);
    setBadge('desktopBadgeCommunity', communityBadgeCount);
    setBadge('mobileBadgeCommunity', communityBadgeCount);
  }

  function setBadge(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    if (count > 0) {
      el.textContent = String(count);
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  function updateStickyCheckout() {
    const bar = document.getElementById('stickyCheckout');
    if (ui.mode !== 'client' || ui.clientTab !== 'book' || !ui.selectedTime) {
      bar.classList.add('hidden');
      return;
    }

    const state = Store.getState();
    const service = Scheduler.findService(ui.selectedServiceId);
    const barber =
      ui.selectedBarberId === 'any'
        ? { name: 'Qualquer disponível' }
        : Scheduler.findBarber(ui.selectedBarberId);
    const deposit = Math.min(Number(state.settings.depositAmount) || 10, service.price);
    const remaining = Math.max(0, service.price - deposit);

    document.getElementById('stickyTitle').textContent =
      `${service.name} • ${ui.selectedTime} (${barber.name})`;
    document.getElementById('stickySub').textContent =
      `Sinal Pix agora: ${Pix.formatCurrency(deposit)} • Restante na cadeira: ${Pix.formatCurrency(remaining)}`;
    bar.classList.remove('hidden');
  }

  function render() {
    renderHeaderAndNav();
    const root = document.getElementById('viewRoot');

    if (ui.mode === 'client') {
      if (ui.clientTab === 'book') {
        root.innerHTML = renderClientBookView();
      } else if (ui.clientTab === 'bookings') {
        root.innerHTML = renderClientBookingsView();
      } else {
        root.innerHTML = renderClientCommunityView();
      }
    } else {
      root.innerHTML = renderBarberView();
    }

    updateStickyCheckout();
  }

  /* ========================================================================
     CLIENT VIEW 1: BOOKING
     ======================================================================== */
  function renderClientBookView() {
    const state = Store.getState();
    const activeClient = Store.getActiveClient();
    const dates = Store.getUpcomingDates(7);
    const slots = Scheduler.getDaySlots(ui.selectedDate, ui.selectedBarberId, activeClient.id);
    const myConfirmedBookings = state.bookings.filter(
      (b) => b.clientId === activeClient.id && b.status === 'confirmed'
    );
    const freeCount = slots.filter((s) => s.status === 'free' || s.status === 'transfer').length;

    const servicesHtml = state.services
      .map((s) => {
        const selected = ui.selectedServiceId === s.id;
        return `
          <button type="button" class="selectable-card ${selected ? 'selected' : ''}" data-action="select-service" data-id="${esc(s.id)}">
            <div class="card-main">
              <div class="card-title">${esc(s.name)}</div>
              <div class="card-meta">${s.duration} min • ${esc(s.desc)}</div>
            </div>
            <div class="price-tag">${Pix.formatCurrency(s.price)}</div>
          </button>
        `;
      })
      .join('');

    const barbersHtml = [
      { id: 'any', name: 'Qualquer disponível', specialty: 'Mais opções de horário', color: '#9AA4B4', initials: '★', rating: 'Rápido' },
      ...state.barbers
    ]
      .map((b) => {
        const selected = ui.selectedBarberId === b.id;
        return `
          <button type="button" class="selectable-card ${selected ? 'selected' : ''}" data-action="select-barber" data-id="${esc(b.id)}">
            <div class="barber-row">
              <div class="avatar" style="background:${esc(b.color)}">${esc(b.initials)}</div>
              <div class="card-main">
                <div class="card-title">${esc(b.name)}</div>
                <div class="card-meta">${esc(b.specialty)} • ★ ${esc(b.rating)}</div>
              </div>
            </div>
          </button>
        `;
      })
      .join('');

    const datesHtml = dates
      .map((d) => {
        const selected = ui.selectedDate === d.iso;
        const count = Scheduler.countFreeSlots(d.iso, ui.selectedBarberId);
        return `
          <button type="button" class="date-chip ${selected ? 'selected' : ''}" data-action="select-date" data-date="${esc(d.iso)}">
            <span class="date-dow">${esc(d.dow)}</span>
            <span class="date-day">${esc(d.day)}</span>
            <span class="date-slots">${count} ${count === 1 ? 'vaga' : 'vagas'}</span>
          </button>
        `;
      })
      .join('');

    const slotsHtml = slots
      .map((s) => {
        const isSelected = ui.selectedTime === s.time && s.status === 'free';
        if (s.status === 'free') {
          return `
            <button type="button" class="slot-btn free ${isSelected ? 'selected' : ''}" data-action="select-time" data-time="${esc(s.time)}">
              <span class="slot-time">${esc(s.time)}</span>
              <span class="slot-label">${isSelected ? 'Selecionado' : 'Livre'}</span>
            </button>
          `;
        }
        if (s.status === 'transfer') {
          return `
            <button type="button" class="slot-btn transfer" data-action="open-claim-transfer" data-booking-id="${esc(s.booking.id)}">
              <span class="slot-time">${esc(s.time)}</span>
              <span class="slot-label">Repasse ⚡</span>
            </button>
          `;
        }
        if (s.status === 'mine') {
          return `
            <button type="button" class="slot-btn mine" data-action="goto-tab" data-target="bookings">
              <span class="slot-time">${esc(s.time)}</span>
              <span class="slot-label">Seu horário</span>
            </button>
          `;
        }
        if (s.status === 'occupied') {
          const canSwap = myConfirmedBookings.length > 0;
          return `
            <button type="button" class="slot-btn occupied ${canSwap ? 'swappable' : ''}"
              ${canSwap ? `data-action="open-swap-modal" data-target-booking-id="${esc(s.booking.id)}"` : 'disabled'}>
              <span class="slot-time">${esc(s.time)}</span>
              <span class="slot-label">${canSwap ? 'Propor troca' : 'Ocupado'}</span>
            </button>
          `;
        }
        return `
          <button type="button" class="slot-btn blocked" disabled>
            <span class="slot-time">${esc(s.time)}</span>
            <span class="slot-label">Indisponível</span>
          </button>
        `;
      })
      .join('');

    return `
      <section class="hero-card">
        <div class="hero-top">
          <div>
            <h1 class="hero-title">Reserve seu corte em segundos</h1>
            <p class="hero-subtitle">Sem esperar resposta no WhatsApp. Escolha seu horário, confirme com o sinal via Pix e garanta sua cadeira.</p>
          </div>
          <span class="pill pill-emerald">● Agenda ao vivo</span>
        </div>
        <div class="hero-features">
          <span class="pill pill-gold">Sinal de ${Pix.formatCurrency(state.settings.depositAmount)} abatido no corte</span>
          <span class="pill pill-sky">Repasse &amp; troca entre clientes</span>
        </div>
      </section>

      <section class="section-block">
        <div class="section-header">
          <h2 class="section-title"><span class="step-num">1</span> Escolha o serviço</h2>
        </div>
        <div class="grid-2">${servicesHtml}</div>
      </section>

      <section class="section-block">
        <div class="section-header">
          <h2 class="section-title"><span class="step-num">2</span> Escolha o barbeiro</h2>
        </div>
        <div class="grid-2">${barbersHtml}</div>
      </section>

      <section class="section-block">
        <div class="section-header">
          <h2 class="section-title"><span class="step-num">3</span> Escolha o dia</h2>
          <span class="section-hint">${esc(formatDateLabel(ui.selectedDate))}</span>
        </div>
        <div class="date-strip">${datesHtml}</div>
      </section>

      <section class="section-block">
        <div class="section-header">
          <h2 class="section-title"><span class="step-num">4</span> Horários disponíveis</h2>
          <span class="section-hint">${freeCount} ${freeCount === 1 ? 'opção' : 'opções'}</span>
        </div>
        <div class="slots-grid">${slotsHtml}</div>

        <div class="slots-legend">
          <span class="legend-item"><span class="legend-dot" style="background:var(--emerald)"></span> Livre</span>
          <span class="legend-item"><span class="legend-dot" style="background:var(--sky)"></span> Repasse (vaga liberada por outro cliente)</span>
          <span class="legend-item"><span class="legend-dot" style="background:var(--text-dim)"></span> Ocupado (clique p/ propor troca se já tiver horário)</span>
        </div>

        <div class="waitlist-banner">
          <div>
            <div class="card-title">Não achou o horário ideal em ${esc(formatDateLabel(ui.selectedDate))}?</div>
            <div class="card-meta">Entre na fila de espera para assumir vagas de repasse assim que alguém liberar.</div>
          </div>
          <button type="button" class="btn btn-outline btn-sm" data-action="open-waitlist-modal">Entrar na Fila</button>
        </div>
      </section>
    `;
  }

  /* ========================================================================
     CLIENT VIEW 2: MY BOOKINGS + RECEIVED SWAPS
     ======================================================================== */
  function renderClientBookingsView() {
    const state = Store.getState();
    const activeClient = Store.getActiveClient();

    const receivedSwaps = state.swapRequests.filter(
      (s) => s.status === 'pending' && s.toClientId === activeClient.id
    );

    const myBookings = state.bookings
      .filter((b) => b.clientId === activeClient.id)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    let swapsBanner = '';
    if (receivedSwaps.length > 0) {
      swapsBanner = `
        <section class="section-block">
          <div class="section-header">
            <h2 class="section-title">Propostas de troca recebidas (${receivedSwaps.length})</h2>
          </div>
          ${receivedSwaps
            .map((sw) => {
              const fromBk = state.bookings.find((b) => b.id === sw.fromBookingId);
              const toBk = state.bookings.find((b) => b.id === sw.toBookingId);
              if (!fromBk || !toBk) return '';
              const fromBarber = Scheduler.findBarber(fromBk.barberId);
              return `
                <div class="panel-card highlight-gold">
                  <div class="card-row-top">
                    <div>
                      <div class="card-title">${esc(fromBk.clientName)} quer trocar de horário com você</div>
                      <div class="card-meta">
                        Você vai para: <strong>${esc(formatDateLabel(fromBk.date))} às ${esc(fromBk.time)}</strong> (${esc(fromBarber?.name || '')})
                        <br/>Seu horário atual: ${esc(formatDateLabel(toBk.date))} às ${esc(toBk.time)}
                      </div>
                    </div>
                    <span class="pill pill-gold">Troca pendente</span>
                  </div>
                  <p class="card-meta" style="color:var(--text);">"${esc(sw.note)}"</p>
                  <div class="card-actions">
                    <button type="button" class="btn btn-emerald btn-sm" data-action="respond-swap" data-swap-id="${esc(sw.id)}" data-accept="true">
                      Aceitar troca (sinal mantido)
                    </button>
                    <button type="button" class="btn btn-outline btn-sm" data-action="respond-swap" data-swap-id="${esc(sw.id)}" data-accept="false">
                      Recusar
                    </button>
                  </div>
                </div>
              `;
            })
            .join('')}
        </section>
      `;
    }

    const bookingsHtml =
      myBookings.length === 0
        ? `
          <div class="empty-state">
            <h3>Você ainda não tem horários agendados</h3>
            <p>Escolha seu serviço, barbeiro e horário. Com o sinal via Pix sua cadeira fica garantida na hora.</p>
            <button type="button" class="btn btn-primary" data-action="goto-tab" data-target="book">Agendar agora</button>
          </div>
        `
        : myBookings
            .map((bk) => {
              const service = Scheduler.findService(bk.serviceId);
              const barber = Scheduler.findBarber(bk.barberId);
              const remaining = Math.max(0, bk.price - bk.deposit);

              let statusPill = '<span class="pill pill-emerald">Confirmado • Sinal pago</span>';
              if (bk.status === 'pending_pix') {
                statusPill = '<span class="pill pill-gold">Aguardando Pix</span>';
              } else if (bk.status === 'completed') {
                statusPill = '<span class="pill pill-muted">Concluído</span>';
              } else if (bk.status === 'no_show') {
                statusPill = '<span class="pill pill-rose">Falta registrada</span>';
              } else if (bk.transferOffer) {
                statusPill = '<span class="pill pill-sky">Em repasse no mural</span>';
              }

              let actions = '';
              if (bk.status === 'pending_pix') {
                actions = `
                  <div class="card-actions">
                    <button type="button" class="btn btn-primary btn-sm" data-action="reopen-pix" data-booking-id="${esc(bk.id)}">Pagar Sinal Pix</button>
                    <button type="button" class="btn btn-danger-outline btn-sm" data-action="cancel-booking" data-booking-id="${esc(bk.id)}">Cancelar</button>
                  </div>
                `;
              } else if (bk.status === 'confirmed') {
                actions = `
                  <div class="card-actions">
                    ${
                      bk.transferOffer
                        ? `<button type="button" class="btn btn-outline btn-sm" data-action="cancel-transfer" data-booking-id="${esc(bk.id)}">Retirar do repasse</button>`
                        : `<button type="button" class="btn btn-sky btn-sm" data-action="open-transfer-modal" data-booking-id="${esc(bk.id)}">Repassar horário</button>`
                    }
                    <button type="button" class="btn btn-outline btn-sm" data-action="open-swap-from-mine" data-booking-id="${esc(bk.id)}">Propor troca</button>
                  </div>
                `;
              }

              return `
                <div class="panel-card ${bk.transferOffer ? 'highlight-sky' : ''}">
                  <div class="card-row-top">
                    <div>
                      <div class="card-title">${esc(service?.name || 'Serviço')} • <span class="mono">${esc(bk.time)}</span></div>
                      <div class="card-meta">
                        ${esc(formatDateLabel(bk.date))} • Barbeiro: <strong>${esc(barber?.name || '')}</strong> • Código <span class="mono">#${esc(bk.code)}</span>
                      </div>
                    </div>
                    ${statusPill}
                  </div>
                  <div class="card-meta">
                    Total: <strong>${Pix.formatCurrency(bk.price)}</strong> •
                    Sinal Pix: <strong style="color:#4ade80">${Pix.formatCurrency(bk.deposit)}</strong> •
                    Restante na barbearia: <strong>${Pix.formatCurrency(remaining)}</strong>
                  </div>
                  ${
                    bk.transferOffer
                      ? `<div class="card-meta" style="color:#7dd3fc;margin-top:6px;">No mural de repasse: "${esc(bk.transferNote)}" (assim que outro cliente assumir, seu sinal é estornado).</div>`
                      : ''
                  }
                  ${actions}
                </div>
              `;
            })
            .join('');

    return `
      ${swapsBanner}
      <section class="section-block">
        <div class="section-header">
          <h2 class="section-title">Meus Horários (${esc(activeClient.name)})</h2>
          <button type="button" class="btn btn-primary btn-sm" data-action="goto-tab" data-target="book">+ Novo horário</button>
        </div>
        ${bookingsHtml}
      </section>
    `;
  }

  /* ========================================================================
     CLIENT VIEW 3: COMMUNITY (TRANSFERS, SWAPS & WAITLIST)
     ======================================================================== */
  function renderClientCommunityView() {
    const state = Store.getState();
    const activeClient = Store.getActiveClient();

    const transferOffers = state.bookings.filter(
      (b) => b.status === 'confirmed' && b.transferOffer === true
    );

    const pendingSwaps = state.swapRequests.filter((s) => s.status === 'pending');

    const transfersHtml =
      transferOffers.length === 0
        ? `<div class="empty-state"><h3>Nenhum horário em repasse no momento</h3><p>Quando algum cliente tiver um imprevisto e liberar o horário, a vaga aparece aqui na hora.</p></div>`
        : transferOffers
            .map((bk) => {
              const service = Scheduler.findService(bk.serviceId);
              const barber = Scheduler.findBarber(bk.barberId);
              const isMine = bk.clientId === activeClient.id;
              return `
                <div class="panel-card highlight-sky">
                  <div class="card-row-top">
                    <div>
                      <div class="card-title">${esc(formatDateLabel(bk.date))} às <span class="mono">${esc(bk.time)}</span></div>
                      <div class="card-meta">Barbeiro: <strong>${esc(barber?.name || '')}</strong> • Repassado por ${esc(bk.clientName)}</div>
                    </div>
                    <span class="pill pill-sky">Vaga Relâmpago ⚡</span>
                  </div>
                  <div class="card-meta" style="color:var(--text);">"${esc(bk.transferNote)}"</div>
                  <div class="card-meta" style="margin-top:6px;">
                    Serviço atual: ${esc(service?.name || '')} • Sinal Pix para assumir: <strong>${Pix.formatCurrency(state.settings.depositAmount)}</strong>
                  </div>
                  <div class="card-actions">
                    ${
                      isMine
                        ? `<button type="button" class="btn btn-outline btn-sm" data-action="cancel-transfer" data-booking-id="${esc(bk.id)}">Cancelar meu repasse</button>`
                        : `<button type="button" class="btn btn-sky btn-sm" data-action="open-claim-transfer" data-booking-id="${esc(bk.id)}">Assumir horário (Pix ${Pix.formatCurrency(state.settings.depositAmount)})</button>`
                    }
                  </div>
                </div>
              `;
            })
            .join('');

    const swapsHtml =
      pendingSwaps.length === 0
        ? `<div class="empty-state"><h3>Nenhuma proposta de troca ativa</h3><p>Se você já tem um horário confirmado, pode propor troca com outro cliente na aba <strong>Meus Horários</strong> ou clicando em um horário ocupado na agenda.</p></div>`
        : pendingSwaps
            .map((sw) => {
              const fromBk = state.bookings.find((b) => b.id === sw.fromBookingId);
              const toBk = state.bookings.find((b) => b.id === sw.toBookingId);
              if (!fromBk || !toBk) return '';
              const isRecipient = sw.toClientId === activeClient.id;
              const isSender = sw.fromClientId === activeClient.id;
              return `
                <div class="panel-card ${isRecipient ? 'highlight-gold' : ''}">
                  <div class="card-row-top">
                    <div>
                      <div class="card-title">${esc(fromBk.clientName)} (${esc(fromBk.time)}) ↔ ${esc(toBk.clientName)} (${esc(toBk.time)})</div>
                      <div class="card-meta">${esc(formatDateLabel(fromBk.date))} ↔ ${esc(formatDateLabel(toBk.date))} • ${timeAgo(sw.createdAt)}</div>
                    </div>
                    <span class="pill pill-gold">${isRecipient ? 'Aguardando você' : 'Pendente'}</span>
                  </div>
                  <div class="card-meta" style="color:var(--text);">"${esc(sw.note)}"</div>
                  ${
                    isRecipient
                      ? `
                        <div class="card-actions">
                          <button type="button" class="btn btn-emerald btn-sm" data-action="respond-swap" data-swap-id="${esc(sw.id)}" data-accept="true">Aceitar troca</button>
                          <button type="button" class="btn btn-outline btn-sm" data-action="respond-swap" data-swap-id="${esc(sw.id)}" data-accept="false">Recusar</button>
                        </div>
                      `
                      : isSender
                        ? `<div class="card-actions"><button type="button" class="btn btn-outline btn-sm" data-action="respond-swap" data-swap-id="${esc(sw.id)}" data-accept="false">Cancelar proposta</button></div>`
                        : ''
                  }
                </div>
              `;
            })
            .join('');

    const waitlistHtml =
      state.waitlist.length === 0
        ? `<div class="empty-state"><h3>Fila de espera vazia</h3><p>Cadastre seu interesse para ser avisado quando surgir uma vaga de repasse.</p></div>`
        : state.waitlist
            .map((w) => {
              const barber = w.barberId === 'any' ? { name: 'Qualquer barbeiro' } : Scheduler.findBarber(w.barberId);
              const hasMatchingTransfer = transferOffers.some((t) => t.date === w.date && t.clientId !== w.clientId);
              const isMine = w.clientId === activeClient.id;
              return `
                <div class="panel-card">
                  <div class="card-row-top">
                    <div>
                      <div class="card-title">${esc(w.clientName)} • ${esc(formatDateLabel(w.date))}</div>
                      <div class="card-meta">Turno: ${esc(w.period)} • ${esc(barber?.name || '')}</div>
                    </div>
                    ${
                      hasMatchingTransfer
                        ? '<span class="pill pill-emerald">Vaga de repasse disponível!</span>'
                        : '<span class="pill pill-muted">Aguardando vaga</span>'
                    }
                  </div>
                  ${
                    isMine
                      ? `<div class="card-actions"><button type="button" class="btn btn-outline btn-sm" data-action="remove-waitlist" data-id="${esc(w.id)}">Sair da fila</button></div>`
                      : ''
                  }
                </div>
              `;
            })
            .join('');

    return `
      <section class="section-block">
        <div class="section-header">
          <h2 class="section-title">Horários em Repasse (${transferOffers.length})</h2>
          <span class="section-hint">Assuma a vaga pagando apenas o sinal</span>
        </div>
        ${transfersHtml}
      </section>

      <section class="section-block">
        <div class="section-header">
          <h2 class="section-title">Trocas entre Clientes (${pendingSwaps.length})</h2>
        </div>
        ${swapsHtml}
      </section>

      <section class="section-block">
        <div class="section-header">
          <h2 class="section-title">Fila de Espera (${state.waitlist.length})</h2>
          <button type="button" class="btn btn-primary btn-sm" data-action="open-waitlist-modal">+ Entrar na fila</button>
        </div>
        ${waitlistHtml}
      </section>
    `;
  }

  /* ========================================================================
     BARBER DASHBOARD VIEW
     ======================================================================== */
  function renderBarberView() {
    const state = Store.getState();
    const dates = Store.getUpcomingDates(7);
    const stats = Scheduler.getBarberStats(ui.barberFilterDate);

    const kpiHtml = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Sinais Garantidos (Pix)</div>
          <div class="kpi-value" style="color:#4ade80">${Pix.formatCurrency(stats.depositsGuaranteed)}</div>
          <div class="kpi-sub">Protegido contra faltas</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">A Receber na Cadeira</div>
          <div class="kpi-value" style="color:var(--gold-bright)">${Pix.formatCurrency(stats.remainingToReceive)}</div>
          <div class="kpi-sub">${esc(formatDateLabel(ui.barberFilterDate))}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Ocupação do Dia</div>
          <div class="kpi-value">${stats.occupancyPct}%</div>
          <div class="kpi-sub">${stats.occupiedCount} de ${stats.totalPossible} horários</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Vagas Salvas</div>
          <div class="kpi-value" style="color:var(--sky)">${stats.savedSlotsCount}</div>
          <div class="kpi-sub">Por repasses e trocas</div>
        </div>
      </div>
    `;

    const subtabsHtml = `
      <div class="subtabs">
        <button type="button" class="subtab ${ui.barberTab === 'agenda' ? 'active' : ''}" data-action="barber-tab" data-tab-name="agenda">Agenda do Dia</button>
        <button type="button" class="subtab ${ui.barberTab === 'feed' ? 'active' : ''}" data-action="barber-tab" data-tab-name="feed">Atividade &amp; Repasses</button>
        <button type="button" class="subtab ${ui.barberTab === 'settings' ? 'active' : ''}" data-action="barber-tab" data-tab-name="settings">Configurações</button>
      </div>
    `;

    let bodyHtml = '';

    if (ui.barberTab === 'agenda') {
      const dateOptions = dates
        .map(
          (d) =>
            `<option value="${esc(d.iso)}" ${d.iso === ui.barberFilterDate ? 'selected' : ''}>${esc(d.fullLabel)}</option>`
        )
        .join('');
      const barberOptions = state.barbers
        .map(
          (b) =>
            `<option value="${esc(b.id)}" ${b.id === ui.barberFilterBarberId ? 'selected' : ''}>${esc(b.name)}</option>`
        )
        .join('');

      const timelineHtml = TIME_SLOTS.map((time) => {
        const blocked = state.blockedSlots.find(
          (b) => b.date === ui.barberFilterDate && b.time === time && b.barberId === ui.barberFilterBarberId
        );
        const booking = state.bookings.find(
          (b) => b.date === ui.barberFilterDate && b.time === time && b.barberId === ui.barberFilterBarberId
        );

        if (blocked) {
          return `
            <div class="timeline-row">
              <div class="timeline-time">${esc(time)}</div>
              <div class="timeline-body">
                <div>
                  <div class="card-title" style="color:var(--text-muted)">Horário Bloqueado</div>
                  <div class="card-meta">${esc(blocked.reason)}</div>
                </div>
                <button type="button" class="btn btn-outline btn-sm" data-action="toggle-block" data-time="${esc(time)}">Liberar horário</button>
              </div>
            </div>
          `;
        }

        if (!booking) {
          return `
            <div class="timeline-row">
              <div class="timeline-time">${esc(time)}</div>
              <div class="timeline-body">
                <div>
                  <span class="pill pill-muted">Livre</span>
                </div>
                <button type="button" class="btn btn-outline btn-sm" data-action="toggle-block" data-time="${esc(time)}">Bloquear</button>
              </div>
            </div>
          `;
        }

        const service = Scheduler.findService(booking.serviceId);
        const remaining = Math.max(0, booking.price - booking.deposit);

        let pill = '<span class="pill pill-emerald">Sinal Pix pago</span>';
        if (booking.status === 'pending_pix') pill = '<span class="pill pill-gold">Aguardando Pix</span>';
        if (booking.status === 'completed') pill = '<span class="pill pill-muted">Atendido ✓</span>';
        if (booking.status === 'no_show') pill = '<span class="pill pill-rose">Faltou (sinal retido)</span>';
        if (booking.transferOffer && booking.status === 'confirmed') pill = '<span class="pill pill-sky">Em repasse</span>';

        return `
          <div class="timeline-row">
            <div class="timeline-time">${esc(time)}</div>
            <div class="timeline-body">
              <div>
                <div class="card-title">${esc(booking.clientName)} • ${esc(service?.name || '')}</div>
                <div class="card-meta">
                  ${esc(booking.clientPhone)} • Sinal: ${Pix.formatCurrency(booking.deposit)} • Falta pagar: ${Pix.formatCurrency(remaining)}
                </div>
                <div style="margin-top:6px;">${pill}</div>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                ${
                  booking.status === 'pending_pix'
                    ? `<button type="button" class="btn btn-emerald btn-sm" data-action="barber-status" data-booking-id="${esc(booking.id)}" data-status="confirmed">Aprovar Pix</button>`
                    : ''
                }
                ${
                  booking.status === 'confirmed'
                    ? `
                      <button type="button" class="btn btn-emerald btn-sm" data-action="barber-status" data-booking-id="${esc(booking.id)}" data-status="completed">Concluir</button>
                      <button type="button" class="btn btn-danger-outline btn-sm" data-action="barber-status" data-booking-id="${esc(booking.id)}" data-status="no_show">Faltou</button>
                    `
                    : ''
                }
              </div>
            </div>
          </div>
        `;
      }).join('');

      bodyHtml = `
        <div class="panel-card">
          <div class="form-row">
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label" for="barberDateSelect">Data</label>
              <select id="barberDateSelect" class="form-control">${dateOptions}</select>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label" for="barberSelect">Barbeiro</label>
              <select id="barberSelect" class="form-control">${barberOptions}</select>
            </div>
          </div>
        </div>
        ${timelineHtml}
      `;
    } else if (ui.barberTab === 'feed') {
      const feedHtml =
        state.activityLog.length === 0
          ? `<div class="empty-state"><h3>Sem atividades recentes</h3></div>`
          : state.activityLog
              .map(
                (item) => `
                  <div class="panel-card">
                    <div class="card-row-top" style="margin-bottom:4px;">
                      <div class="card-title" style="font-size:14px;">${esc(item.text)}</div>
                      <span class="card-meta">${timeAgo(item.createdAt)}</span>
                    </div>
                  </div>
                `
              )
              .join('');

      bodyHtml = `
        <div class="section-header">
          <h2 class="section-title">Movimentações em Tempo Real</h2>
          <span class="section-hint">Pagamentos, repasses e trocas</span>
        </div>
        ${feedHtml}
      `;
    } else {
      bodyHtml = `
        <div class="panel-card">
          <h2 class="section-title" style="margin-bottom:14px;">Configurações da Barbearia</h2>
          <form id="settingsForm">
            <div class="form-group">
              <label class="form-label" for="cfgShopName">Nome da Barbearia</label>
              <input id="cfgShopName" class="form-control" type="text" value="${esc(state.settings.shopName)}" required />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="cfgDeposit">Valor do Sinal Pix (R$)</label>
                <input id="cfgDeposit" class="form-control" type="number" min="1" max="100" step="1" value="${esc(state.settings.depositAmount)}" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="cfgPixKey">Chave Pix da Barbearia</label>
                <input id="cfgPixKey" class="form-control" type="text" value="${esc(state.settings.pixKey)}" required />
              </div>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
              <button type="submit" class="btn btn-primary">Salvar configurações</button>
              <button type="button" class="btn btn-danger-outline" data-action="reset-demo">Resetar dados de demonstração</button>
            </div>
          </form>
        </div>
      `;
    }

    return `${kpiHtml}${subtabsHtml}${bodyHtml}`;
  }

  /* ========================================================================
     MODALS (PIX CHECKOUT, CLAIM TRANSFER, OFFER TRANSFER, SWAP, WAITLIST, CLIENT)
     ======================================================================== */
  function openPixModal(booking, options = {}) {
    const state = Store.getState();
    const service = Scheduler.findService(booking.serviceId);
    const barber = Scheduler.findBarber(booking.barberId);
    const isTransferClaim = Boolean(options.isTransferClaim);
    const deposit = isTransferClaim
      ? Math.min(Number(state.settings.depositAmount) || 10, service.price)
      : booking.deposit;
    const remaining = Math.max(0, service.price - deposit);

    const payload = Pix.buildPixPayload({
      pixKey: state.settings.pixKey,
      receiver: state.settings.pixReceiver,
      city: state.settings.city,
      amount: deposit,
      txid: booking.code
    });
    const qrSvg = Pix.generateQrSvg(payload);
    const expiresAt = booking.expiresAt || Date.now() + 10 * 60 * 1000;

    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">${isTransferClaim ? 'Assumir Horário via Pix' : 'Sinal via Pix para Confirmar'}</h3>
        <button type="button" class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px;flex-wrap:wrap;">
        <span class="pill pill-gold">Pré-reserva ativa</span>
        <span class="timer-pill" id="pixCountdown">⏱ 10:00</span>
      </div>

      <div class="breakdown-box">
        <div class="breakdown-row"><span>Horário</span><strong>${esc(formatDateLabel(booking.date))} às ${esc(booking.time)}</strong></div>
        <div class="breakdown-row"><span>Barbeiro</span><strong>${esc(barber?.name || '')}</strong></div>
        <div class="breakdown-row"><span>Serviço</span><strong>${esc(service?.name || '')} (${Pix.formatCurrency(service.price)})</strong></div>
        <div class="breakdown-row"><span>Restante na barbearia</span><span>${Pix.formatCurrency(remaining)}</span></div>
        <div class="breakdown-row total"><span>Sinal Pix agora</span><span style="color:#4ade80">${Pix.formatCurrency(deposit)}</span></div>
      </div>

      <div class="pix-qr-wrap">${qrSvg}</div>

      <div class="form-label">Pix Copia e Cola (simulado no MVP)</div>
      <div class="pix-code-box" id="pixPayloadText">${esc(payload)}</div>

      <div style="display:flex;flex-direction:column;gap:8px;">
        <button type="button" class="btn btn-outline btn-full" data-action="copy-pix">Copiar código Pix</button>
        <button type="button" class="btn btn-emerald btn-full"
          data-action="${isTransferClaim ? 'confirm-transfer-pix' : 'confirm-pix'}"
          data-booking-id="${esc(booking.id)}"
          data-service-id="${esc(service.id)}">
          Simular Pagamento Confirmado ✓
        </button>
        ${
          !isTransferClaim
            ? `<button type="button" class="btn btn-danger-outline btn-full btn-sm" data-action="cancel-booking-modal" data-booking-id="${esc(booking.id)}">Cancelar pré-reserva</button>`
            : ''
        }
      </div>
    `);

    const updateTimer = () => {
      const el = document.getElementById('pixCountdown');
      if (!el) return;
      const ms = expiresAt - Date.now();
      el.textContent = '⏱ ' + Pix.formatCountdown(ms);
    };
    updateTimer();
    ui.pixTimerInterval = setInterval(updateTimer, 1000);
  }

  function openClaimTransferModal(bookingId) {
    const state = Store.getState();
    const bk = state.bookings.find((b) => b.id === bookingId);
    if (!bk || !bk.transferOffer) {
      showToast('Essa vaga de repasse não está mais disponível.', 'error');
      return;
    }
    const activeClient = Store.getActiveClient();
    if (bk.clientId === activeClient.id) {
      showToast('Você já é o dono deste horário.', 'error');
      return;
    }
    openPixModal(bk, { isTransferClaim: true });
  }

  function openOfferTransferModal(bookingId) {
    const bk = Store.getState().bookings.find((b) => b.id === bookingId);
    if (!bk) return;
    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Repassar Horário</h3>
        <button type="button" class="modal-close" data-action="close-modal">×</button>
      </div>
      <p class="card-meta" style="margin-bottom:14px;">
        Teve um imprevisto? Coloque seu horário de <strong>${esc(formatDateLabel(bk.date))} às ${esc(bk.time)}</strong> no mural de repasse.
        Assim que outro cliente assumir pagando o sinal, seu sinal de <strong>${Pix.formatCurrency(bk.deposit)}</strong> é devolvido e o barbeiro não fica no prejuízo.
      </p>
      <form id="offerTransferForm" data-booking-id="${esc(bk.id)}">
        <div class="form-group">
          <label class="form-label" for="transferNoteInput">Recado curto (opcional)</label>
          <input id="transferNoteInput" class="form-control" type="text" placeholder="Ex: Imprevisto no trabalho, passo minha vaga!" />
        </div>
        <button type="submit" class="btn btn-sky btn-full">Publicar no mural de repasse</button>
      </form>
    `);
  }

  function openSwapModal({ myBookingId = null, targetBookingId = null }) {
    const state = Store.getState();
    const activeClient = Store.getActiveClient();
    const myBookings = state.bookings.filter(
      (b) => b.clientId === activeClient.id && b.status === 'confirmed'
    );
    const otherBookings = state.bookings.filter(
      (b) => b.clientId !== activeClient.id && b.status === 'confirmed'
    );

    if (myBookings.length === 0) {
      showToast('Você precisa ter um horário confirmado para propor uma troca.', 'error');
      return;
    }
    if (otherBookings.length === 0) {
      showToast('Não há outros horários confirmados disponíveis para troca.', 'error');
      return;
    }

    const myOpts = myBookings
      .map((b) => {
        const barber = Scheduler.findBarber(b.barberId);
        return `<option value="${esc(b.id)}" ${b.id === myBookingId ? 'selected' : ''}>${esc(formatDateLabel(b.date))} às ${esc(b.time)} (${esc(barber?.name || '')})</option>`;
      })
      .join('');

    const targetOpts = otherBookings
      .map((b) => {
        const barber = Scheduler.findBarber(b.barberId);
        return `<option value="${esc(b.id)}" ${b.id === targetBookingId ? 'selected' : ''}>${esc(b.clientName)} — ${esc(formatDateLabel(b.date))} às ${esc(b.time)} (${esc(barber?.name || '')})</option>`;
      })
      .join('');

    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Propor Troca de Horário</h3>
        <button type="button" class="modal-close" data-action="close-modal">×</button>
      </div>
      <p class="card-meta" style="margin-bottom:14px;">
        Se o outro cliente aceitar, os horários são trocados automaticamente na agenda do barbeiro mantendo o sinal Pix de ambos!
      </p>
      <form id="proposeSwapForm">
        <div class="form-group">
          <label class="form-label" for="swapMyBooking">Seu horário</label>
          <select id="swapMyBooking" class="form-control">${myOpts}</select>
        </div>
        <div class="form-group">
          <label class="form-label" for="swapTargetBooking">Horário que você quer</label>
          <select id="swapTargetBooking" class="form-control">${targetOpts}</select>
        </div>
        <div class="form-group">
          <label class="form-label" for="swapNote">Mensagem para o cliente</label>
          <input id="swapNote" class="form-control" type="text" placeholder="Ex: Consegue trocar comigo? Preciso cortar mais tarde." />
        </div>
        <button type="submit" class="btn btn-primary btn-full">Enviar proposta de troca</button>
      </form>
    `);
  }

  function openWaitlistModal() {
    const state = Store.getState();
    const dates = Store.getUpcomingDates(7);
    const dateOpts = dates
      .map(
        (d) =>
          `<option value="${esc(d.iso)}" ${d.iso === ui.selectedDate ? 'selected' : ''}>${esc(d.fullLabel)}</option>`
      )
      .join('');
    const barberOpts = [
      `<option value="any">Qualquer barbeiro</option>`,
      ...state.barbers.map((b) => `<option value="${esc(b.id)}">${esc(b.name)}</option>`)
    ].join('');

    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Entrar na Fila de Espera</h3>
        <button type="button" class="modal-close" data-action="close-modal">×</button>
      </div>
      <form id="waitlistForm">
        <div class="form-group">
          <label class="form-label" for="wlDate">Dia desejado</label>
          <select id="wlDate" class="form-control">${dateOpts}</select>
        </div>
        <div class="form-group">
          <label class="form-label" for="wlPeriod">Turno preferido</label>
          <select id="wlPeriod" class="form-control">
            <option value="Manhã (09h - 12h)">Manhã (09h - 12h)</option>
            <option value="Tarde (13h - 17h)">Tarde (13h - 17h)</option>
            <option value="Noite (18h - 19h)">Noite (18h - 19h)</option>
            <option value="Qualquer horário">Qualquer horário</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="wlBarber">Barbeiro</label>
          <select id="wlBarber" class="form-control">${barberOpts}</select>
        </div>
        <button type="submit" class="btn btn-primary btn-full">Confirmar entrada na fila</button>
      </form>
    `);
  }

  function openNewClientModal() {
    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Novo Perfil de Cliente</h3>
        <button type="button" class="modal-close" data-action="close-modal">×</button>
      </div>
      <form id="newClientForm">
        <div class="form-group">
          <label class="form-label" for="newClientName">Seu nome</label>
          <input id="newClientName" class="form-control" type="text" placeholder="Ex: João Pedro" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="newClientPhone">WhatsApp</label>
          <input id="newClientPhone" class="form-control" type="tel" placeholder="(11) 99999-9999" />
        </div>
        <button type="submit" class="btn btn-primary btn-full">Criar e entrar</button>
      </form>
    `);
  }

  /* ========================================================================
     GLOBAL EVENT LISTENERS
     ======================================================================== */
  document.addEventListener('click', (e) => {
    // Mode switch
    const modeBtn = e.target.closest('.mode-btn');
    if (modeBtn) {
      ui.mode = modeBtn.dataset.mode;
      render();
      return;
    }

    // Client tabs (desktop & mobile)
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) {
      ui.clientTab = tabBtn.dataset.tab;
      render();
      return;
    }

    // Backdrop close
    if (e.target.id === 'modalBackdrop') {
      closeModal();
      return;
    }

    // New client button
    if (e.target.id === 'btnNewClient') {
      openNewClientModal();
      return;
    }

    // Start Pix Checkout from sticky bar
    if (e.target.id === 'btnStartPixCheckout') {
      if (!ui.selectedTime) return;
      const res = Scheduler.createPendingBooking({
        date: ui.selectedDate,
        time: ui.selectedTime,
        barberId: ui.selectedBarberId,
        serviceId: ui.selectedServiceId
      });
      if (!res.ok) {
        showToast(res.error, 'error');
        render();
        return;
      }
      ui.selectedTime = null;
      render();
      openPixModal(res.booking);
      return;
    }

    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;

    switch (action) {
      case 'close-modal':
        closeModal();
        break;

      case 'select-service':
        ui.selectedServiceId = actionEl.dataset.id;
        render();
        break;

      case 'select-barber':
        ui.selectedBarberId = actionEl.dataset.id;
        ui.selectedTime = null;
        render();
        break;

      case 'select-date':
        ui.selectedDate = actionEl.dataset.date;
        ui.selectedTime = null;
        render();
        break;

      case 'select-time':
        ui.selectedTime = ui.selectedTime === actionEl.dataset.time ? null : actionEl.dataset.time;
        render();
        break;

      case 'goto-tab':
        ui.clientTab = actionEl.dataset.target;
        render();
        break;

      case 'copy-pix': {
        const text = document.getElementById('pixPayloadText')?.textContent || '';
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(
            () => showToast('Código Pix copiado!', 'success'),
            () => showToast('Código selecionado para cópia.', 'info')
          );
        } else {
          showToast('Código Pix pronto para copiar.', 'info');
        }
        break;
      }

      case 'confirm-pix': {
        const res = Scheduler.confirmPixPayment(actionEl.dataset.bookingId);
        closeModal();
        if (res.ok) {
          showToast(`Sinal confirmado! Reserva #${res.booking.code} garantida.`, 'success');
          ui.clientTab = 'bookings';
          render();
        }
        break;
      }

      case 'confirm-transfer-pix': {
        const res = Scheduler.completeTransferClaim(
          actionEl.dataset.bookingId,
          actionEl.dataset.serviceId
        );
        closeModal();
        if (res.ok) {
          showToast(
            `Vaga assumida! Sinal de ${res.previousClientName} estornado e seu horário #${res.booking.code} está confirmado.`,
            'success'
          );
          ui.clientTab = 'bookings';
          render();
        } else {
          showToast(res.error || 'Erro ao assumir vaga.', 'error');
        }
        break;
      }

      case 'reopen-pix': {
        const bk = Store.getState().bookings.find((b) => b.id === actionEl.dataset.bookingId);
        if (bk) openPixModal(bk);
        break;
      }

      case 'cancel-booking':
      case 'cancel-booking-modal':
        Scheduler.cancelBooking(actionEl.dataset.bookingId);
        closeModal();
        showToast('Pré-reserva cancelada e horário liberado.', 'info');
        render();
        break;

      case 'open-transfer-modal':
        openOfferTransferModal(actionEl.dataset.bookingId);
        break;

      case 'cancel-transfer':
        Scheduler.cancelTransferOffer(actionEl.dataset.bookingId);
        showToast('Horário retirado do mural de repasse.', 'info');
        render();
        break;

      case 'open-claim-transfer':
        openClaimTransferModal(actionEl.dataset.bookingId);
        break;

      case 'open-swap-modal':
        openSwapModal({ targetBookingId: actionEl.dataset.targetBookingId });
        break;

      case 'open-swap-from-mine':
        openSwapModal({ myBookingId: actionEl.dataset.bookingId });
        break;

      case 'respond-swap': {
        const accept = actionEl.dataset.accept === 'true';
        const res = Scheduler.respondSwap(actionEl.dataset.swapId, accept);
        if (res.ok) {
          showToast(
            accept
              ? 'Troca aceita! Os dois horários foram atualizados na agenda.'
              : 'Proposta recusada/cancelada.',
            accept ? 'success' : 'info'
          );
          render();
        } else {
          showToast(res.error, 'error');
        }
        break;
      }

      case 'open-waitlist-modal':
        openWaitlistModal();
        break;

      case 'remove-waitlist':
        Scheduler.removeWaitlist(actionEl.dataset.id);
        showToast('Você saiu da fila de espera.', 'info');
        render();
        break;

      case 'barber-tab':
        ui.barberTab = actionEl.dataset.tabName;
        render();
        break;

      case 'toggle-block': {
        const res = Scheduler.toggleBlockSlot(
          ui.barberFilterDate,
          actionEl.dataset.time,
          ui.barberFilterBarberId
        );
        showToast(res.blocked ? 'Horário bloqueado.' : 'Horário liberado.', 'info');
        render();
        break;
      }

      case 'barber-status': {
        const st = actionEl.dataset.status;
        Scheduler.updateBookingStatus(actionEl.dataset.bookingId, st);
        showToast(
          st === 'no_show'
            ? 'Falta registrada — sinal Pix retido para a barbearia.'
            : 'Status atualizado!',
          st === 'no_show' ? 'error' : 'success'
        );
        render();
        break;
      }

      case 'reset-demo':
        Store.resetDemoData();
        ui.selectedTime = null;
        showToast('Dados de demonstração restaurados!', 'success');
        render();
        break;
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'clientSwitcher') {
      Store.setActiveClient(e.target.value);
      ui.selectedTime = null;
      render();
      return;
    }
    if (e.target.id === 'barberDateSelect') {
      ui.barberFilterDate = e.target.value;
      render();
      return;
    }
    if (e.target.id === 'barberSelect') {
      ui.barberFilterBarberId = e.target.value;
      render();
    }
  });

  document.addEventListener('submit', (e) => {
    if (e.target.id === 'offerTransferForm') {
      e.preventDefault();
      const bookingId = e.target.dataset.bookingId;
      const note = document.getElementById('transferNoteInput').value;
      const res = Scheduler.offerForTransfer(bookingId, note);
      closeModal();
      if (res.ok) {
        showToast('Horário publicado no mural de repasse!', 'success');
        render();
      } else {
        showToast(res.error, 'error');
      }
      return;
    }

    if (e.target.id === 'proposeSwapForm') {
      e.preventDefault();
      const fromId = document.getElementById('swapMyBooking').value;
      const toId = document.getElementById('swapTargetBooking').value;
      const note = document.getElementById('swapNote').value;
      const res = Scheduler.proposeSwap(fromId, toId, note);
      closeModal();
      if (res.ok) {
        showToast('Proposta de troca enviada! Troque de perfil no topo para aceitar.', 'success');
        render();
      } else {
        showToast(res.error, 'error');
      }
      return;
    }

    if (e.target.id === 'waitlistForm') {
      e.preventDefault();
      const res = Scheduler.addWaitlist({
        date: document.getElementById('wlDate').value,
        period: document.getElementById('wlPeriod').value,
        barberId: document.getElementById('wlBarber').value
      });
      closeModal();
      if (res.ok) {
        showToast('Você entrou na fila de espera!', 'success');
        ui.clientTab = 'community';
        render();
      } else {
        showToast(res.error, 'error');
      }
      return;
    }

    if (e.target.id === 'newClientForm') {
      e.preventDefault();
      const name = document.getElementById('newClientName').value;
      const phone = document.getElementById('newClientPhone').value;
      const created = Store.addCustomClient(name, phone);
      closeModal();
      if (created) {
        showToast(`Bem-vindo, ${created.name}!`, 'success');
        render();
      }
      return;
    }

    if (e.target.id === 'settingsForm') {
      e.preventDefault();
      const shopName = document.getElementById('cfgShopName').value.trim();
      const depositAmount = Number(document.getElementById('cfgDeposit').value);
      const pixKey = document.getElementById('cfgPixKey').value.trim();
      Store.updateSettings({
        shopName: shopName || 'Vibe Barber',
        depositAmount: Number.isFinite(depositAmount) && depositAmount > 0 ? depositAmount : 10,
        pixKey: pixKey || 'pagamentos@vibebarber.com.br'
      });
      showToast('Configurações salvas!', 'success');
      render();
    }
  });

  // Register Service Worker only on HTTP(S)/localhost to avoid file:// errors
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  // Initial render
  document.addEventListener('DOMContentLoaded', render);
})(window);
