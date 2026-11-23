/* ==========================================================================
   BarberSync — Scheduler Engine (Bookings, Pix, Transfers, Swaps & Waitlist)
   ========================================================================== */

(function (global) {
  const { Store, TIME_SLOTS } = global.BarberSync;

  function generateCode() {
    return 'VB-' + String(Math.floor(1000 + Math.random() * 9000));
  }

  function findService(serviceId) {
    return Store.getState().services.find((s) => s.id === serviceId);
  }

  function findBarber(barberId) {
    return Store.getState().barbers.find((b) => b.id === barberId);
  }

  function isSlotOccupied(date, time, barberId) {
    const state = Store.getState();
    const blocked = state.blockedSlots.find(
      (b) => b.date === date && b.time === time && b.barberId === barberId
    );
    if (blocked) return { type: 'blocked', item: blocked };

    const booking = state.bookings.find(
      (b) =>
        b.date === date &&
        b.time === time &&
        b.barberId === barberId &&
        ['pending_pix', 'confirmed', 'completed'].includes(b.status)
    );
    if (booking) return { type: 'booking', item: booking };

    return null;
  }

  function resolveBarberForSlot(date, time, preferredBarberId) {
    const state = Store.getState();
    if (preferredBarberId && preferredBarberId !== 'any') {
      return preferredBarberId;
    }
    const freeBarber = state.barbers.find((barber) => !isSlotOccupied(date, time, barber.id));
    return freeBarber ? freeBarber.id : state.barbers[0].id;
  }

  function getDaySlots(date, barberId, activeClientId) {
    const state = Store.getState();
    const targetBarbers = barberId === 'any' ? state.barbers : state.barbers.filter((b) => b.id === barberId);

    return TIME_SLOTS.map((time) => {
      // Check if active client already has a booking at this time
      const myBooking = state.bookings.find(
        (b) =>
          b.date === date &&
          b.time === time &&
          b.clientId === activeClientId &&
          ['pending_pix', 'confirmed'].includes(b.status) &&
          (barberId === 'any' || b.barberId === barberId)
      );
      if (myBooking) {
        return { time, status: 'mine', booking: myBooking, barberId: myBooking.barberId };
      }

      // Check if there is a transfer offer at this time
      const transferBooking = state.bookings.find(
        (b) =>
          b.date === date &&
          b.time === time &&
          b.status === 'confirmed' &&
          b.transferOffer === true &&
          b.clientId !== activeClientId &&
          (barberId === 'any' || b.barberId === barberId)
      );

      // Check if any target barber is free
      const freeBarber = targetBarbers.find((barber) => !isSlotOccupied(date, time, barber.id));
      if (freeBarber && !transferBooking) {
        return { time, status: 'free', barberId: freeBarber.id };
      }
      if (transferBooking) {
        return { time, status: 'transfer', booking: transferBooking, barberId: transferBooking.barberId };
      }
      if (freeBarber) {
        return { time, status: 'free', barberId: freeBarber.id };
      }

      // Otherwise check if occupied by another confirmed booking (for potential swap) or blocked
      const otherBooking = state.bookings.find(
        (b) =>
          b.date === date &&
          b.time === time &&
          b.status === 'confirmed' &&
          (barberId === 'any' || b.barberId === barberId)
      );
      if (otherBooking) {
        return { time, status: 'occupied', booking: otherBooking, barberId: otherBooking.barberId };
      }

      return { time, status: 'blocked', barberId: targetBarbers[0]?.id };
    });
  }

  function countFreeSlots(date, barberId) {
    const slots = getDaySlots(date, barberId, null);
    return slots.filter((s) => s.status === 'free' || s.status === 'transfer').length;
  }

  function createPendingBooking({ date, time, barberId, serviceId }) {
    const state = Store.getState();
    const client = Store.getActiveClient();
    const resolvedBarberId = resolveBarberForSlot(date, time, barberId);
    const conflict = isSlotOccupied(date, time, resolvedBarberId);
    if (conflict) {
      return { ok: false, error: 'Esse horário acabou de ser ocupado. Escolha outro.' };
    }

    const service = findService(serviceId);
    const deposit = Math.min(Number(state.settings.depositAmount) || 10, service.price);

    const booking = {
      id: 'bk_' + Date.now(),
      code: generateCode(),
      date,
      time,
      barberId: resolvedBarberId,
      serviceId,
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      price: service.price,
      deposit,
      status: 'pending_pix',
      expiresAt: Date.now() + 10 * 60 * 1000,
      transferOffer: false,
      transferNote: '',
      createdAt: Date.now()
    };

    state.bookings.push(booking);
    Store.saveState();
    return { ok: true, booking };
  }

  function confirmPixPayment(bookingId) {
    const state = Store.getState();
    const booking = state.bookings.find((b) => b.id === bookingId);
    if (!booking) return { ok: false, error: 'Reserva não encontrada.' };

    booking.status = 'confirmed';
    booking.paidAt = Date.now();
    delete booking.expiresAt;

    const barber = findBarber(booking.barberId);
    Store.logActivity(
      'booking_confirmed',
      `${booking.clientName} confirmou ${booking.time} (${booking.date}) com ${barber?.name || 'barbeiro'} via sinal Pix.`
    );
    Store.saveState();
    return { ok: true, booking };
  }

  function cancelBooking(bookingId) {
    const state = Store.getState();
    const idx = state.bookings.findIndex((b) => b.id === bookingId);
    if (idx === -1) return { ok: false };
    const [removed] = state.bookings.splice(idx, 1);
    // Cancel any related pending swaps
    state.swapRequests.forEach((sw) => {
      if (sw.status === 'pending' && (sw.fromBookingId === bookingId || sw.toBookingId === bookingId)) {
        sw.status = 'cancelled';
      }
    });
    Store.logActivity('booking_cancelled', `Pré-reserva ${removed.code} de ${removed.clientName} foi cancelada.`);
    Store.saveState();
    return { ok: true };
  }

  function offerForTransfer(bookingId, note) {
    const state = Store.getState();
    const booking = state.bookings.find((b) => b.id === bookingId);
    if (!booking || booking.status !== 'confirmed') {
      return { ok: false, error: 'Apenas horários confirmados podem ir para repasse.' };
    }
    booking.transferOffer = true;
    booking.transferNote = (note || '').trim() || 'Não poderei ir — disponibilizei minha vaga para repasse.';
    Store.logActivity(
      'transfer_listed',
      `${booking.clientName} disponibilizou o horário de ${booking.time} (${booking.date}) para repasse.`
    );
    Store.saveState();
    return { ok: true, booking };
  }

  function cancelTransferOffer(bookingId) {
    const state = Store.getState();
    const booking = state.bookings.find((b) => b.id === bookingId);
    if (!booking) return { ok: false };
    booking.transferOffer = false;
    booking.transferNote = '';
    Store.saveState();
    return { ok: true };
  }

  function completeTransferClaim(bookingId, serviceId) {
    const state = Store.getState();
    const booking = state.bookings.find((b) => b.id === bookingId);
    const newClient = Store.getActiveClient();
    if (!booking || !booking.transferOffer) {
      return { ok: false, error: 'Este horário não está mais disponível para repasse.' };
    }
    if (booking.clientId === newClient.id) {
      return { ok: false, error: 'Você já é o titular deste horário.' };
    }

    const previousClientName = booking.clientName;
    const service = serviceId ? findService(serviceId) : findService(booking.serviceId);

    booking.clientId = newClient.id;
    booking.clientName = newClient.name;
    booking.clientPhone = newClient.phone;
    booking.serviceId = service.id;
    booking.price = service.price;
    booking.deposit = Math.min(Number(state.settings.depositAmount) || 10, service.price);
    booking.transferOffer = false;
    booking.transferNote = '';
    booking.transferredFrom = previousClientName;
    booking.code = generateCode();
    booking.paidAt = Date.now();

    // Remove matching waitlist entries for this client/date
    state.waitlist = state.waitlist.filter(
      (w) => !(w.clientId === newClient.id && w.date === booking.date)
    );

    state.metrics.savedSlotsCount = (state.metrics.savedSlotsCount || 0) + 1;
    Store.logActivity(
      'transfer_claimed',
      `${newClient.name} assumiu o horário de ${booking.time} (${booking.date}) repassado por ${previousClientName}. Sinal estornado ao titular anterior.`
    );
    Store.saveState();
    return { ok: true, booking, previousClientName };
  }

  function proposeSwap(fromBookingId, toBookingId, note) {
    const state = Store.getState();
    const fromBk = state.bookings.find((b) => b.id === fromBookingId && b.status === 'confirmed');
    const toBk = state.bookings.find((b) => b.id === toBookingId && b.status === 'confirmed');

    if (!fromBk || !toBk) {
      return { ok: false, error: 'Ambos os horários precisam estar confirmados.' };
    }
    if (fromBk.clientId === toBk.clientId) {
      return { ok: false, error: 'Você não pode trocar um horário com você mesmo.' };
    }

    const exists = state.swapRequests.find(
      (s) =>
        s.status === 'pending' &&
        ((s.fromBookingId === fromBookingId && s.toBookingId === toBookingId) ||
          (s.fromBookingId === toBookingId && s.toBookingId === fromBookingId))
    );
    if (exists) {
      return { ok: false, error: 'Já existe uma proposta de troca pendente entre esses dois horários.' };
    }

    const swap = {
      id: 'swp_' + Date.now(),
      fromBookingId,
      toBookingId,
      fromClientId: fromBk.clientId,
      toClientId: toBk.clientId,
      note: (note || '').trim() || 'Podemos trocar nossos horários?',
      status: 'pending',
      createdAt: Date.now()
    };

    state.swapRequests.unshift(swap);
    Store.logActivity(
      'swap_proposed',
      `${fromBk.clientName} (${fromBk.time}) propôs troca com ${toBk.clientName} (${toBk.time}).`
    );
    Store.saveState();
    return { ok: true, swap };
  }

  function respondSwap(swapId, accept) {
    const state = Store.getState();
    const swap = state.swapRequests.find((s) => s.id === swapId);
    if (!swap || swap.status !== 'pending') {
      return { ok: false, error: 'Proposta não está mais pendente.' };
    }

    const fromBk = state.bookings.find((b) => b.id === swap.fromBookingId);
    const toBk = state.bookings.find((b) => b.id === swap.toBookingId);

    if (!accept) {
      swap.status = 'rejected';
      Store.logActivity('swap_rejected', `Proposta de troca entre ${fromBk?.clientName || 'cliente'} e ${toBk?.clientName || 'cliente'} foi recusada.`);
      Store.saveState();
      return { ok: true, accepted: false };
    }

    if (!fromBk || !toBk || fromBk.status !== 'confirmed' || toBk.status !== 'confirmed') {
      swap.status = 'cancelled';
      Store.saveState();
      return { ok: false, error: 'Um dos horários não está mais disponível para troca.' };
    }

    // Atomic swap of date, time, and barber while preserving each client's service & paid deposit
    const tempDate = fromBk.date;
    const tempTime = fromBk.time;
    const tempBarber = fromBk.barberId;

    fromBk.date = toBk.date;
    fromBk.time = toBk.time;
    fromBk.barberId = toBk.barberId;
    fromBk.transferOffer = false;

    toBk.date = tempDate;
    toBk.time = tempTime;
    toBk.barberId = tempBarber;
    toBk.transferOffer = false;

    swap.status = 'accepted';
    swap.resolvedAt = Date.now();

    // Cancel any other conflicting pending swaps involving either booking
    state.swapRequests.forEach((other) => {
      if (
        other.id !== swap.id &&
        other.status === 'pending' &&
        (other.fromBookingId === fromBk.id ||
          other.toBookingId === fromBk.id ||
          other.fromBookingId === toBk.id ||
          other.toBookingId === toBk.id)
      ) {
        other.status = 'cancelled';
      }
    });

    state.metrics.savedSlotsCount = (state.metrics.savedSlotsCount || 0) + 1;
    Store.logActivity(
      'swap_accepted',
      `Troca concluída! ${fromBk.clientName} foi para ${fromBk.time} (${fromBk.date}) e ${toBk.clientName} foi para ${toBk.time} (${toBk.date}).`
    );
    Store.saveState();
    return { ok: true, accepted: true };
  }

  function addWaitlist({ date, period, barberId }) {
    const state = Store.getState();
    const client = Store.getActiveClient();
    const duplicate = state.waitlist.find(
      (w) => w.clientId === client.id && w.date === date && w.period === period
    );
    if (duplicate) {
      return { ok: false, error: 'Você já está na fila de espera para esse dia e turno.' };
    }
    const entry = {
      id: 'wl_' + Date.now(),
      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      date,
      period,
      barberId: barberId || 'any',
      createdAt: Date.now()
    };
    state.waitlist.unshift(entry);
    Store.logActivity('waitlist_joined', `${client.name} entrou na fila de espera para ${date} (${period}).`);
    Store.saveState();
    return { ok: true, entry };
  }

  function removeWaitlist(entryId) {
    const state = Store.getState();
    state.waitlist = state.waitlist.filter((w) => w.id !== entryId);
    Store.saveState();
  }

  function toggleBlockSlot(date, time, barberId) {
    const state = Store.getState();
    const idx = state.blockedSlots.findIndex(
      (b) => b.date === date && b.time === time && b.barberId === barberId
    );
    if (idx >= 0) {
      state.blockedSlots.splice(idx, 1);
      Store.saveState();
      return { blocked: false };
    }
    state.blockedSlots.push({
      id: 'blk_' + Date.now(),
      date,
      time,
      barberId,
      reason: 'Bloqueado pelo barbeiro'
    });
    Store.saveState();
    return { blocked: true };
  }

  function updateBookingStatus(bookingId, newStatus) {
    const state = Store.getState();
    const bk = state.bookings.find((b) => b.id === bookingId);
    if (!bk) return { ok: false };
    bk.status = newStatus;
    if (newStatus !== 'confirmed') {
      bk.transferOffer = false;
    }
    const labelMap = {
      confirmed: 'confirmado manualmente',
      completed: 'marcado como concluído',
      no_show: 'marcado como falta (sinal retido pela barbearia)'
    };
    Store.logActivity('barber_action', `Horário ${bk.time} de ${bk.clientName} foi ${labelMap[newStatus] || newStatus}.`);
    Store.saveState();
    return { ok: true, booking: bk };
  }

  function getBarberStats(date) {
    const state = Store.getState();
    const dayBookings = state.bookings.filter((b) => b.date === date && b.status !== 'pending_pix');
    const depositsGuaranteed = dayBookings.reduce((sum, b) => sum + Number(b.deposit || 0), 0);
    const remainingToReceive = dayBookings
      .filter((b) => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, b) => sum + Math.max(0, Number(b.price || 0) - Number(b.deposit || 0)), 0);

    const totalPossible = TIME_SLOTS.length * state.barbers.length;
    const occupiedCount = dayBookings.filter((b) => b.status === 'confirmed' || b.status === 'completed').length;
    const occupancyPct = Math.round((occupiedCount / Math.max(1, totalPossible)) * 100);

    return {
      depositsGuaranteed,
      remainingToReceive,
      occupancyPct,
      occupiedCount,
      totalPossible,
      savedSlotsCount: state.metrics?.savedSlotsCount || 0
    };
  }

  global.BarberSync = global.BarberSync || {};
  global.BarberSync.Scheduler = {
    findService,
    findBarber,
    getDaySlots,
    countFreeSlots,
    createPendingBooking,
    confirmPixPayment,
    cancelBooking,
    offerForTransfer,
    cancelTransferOffer,
    completeTransferClaim,
    proposeSwap,
    respondSwap,
    addWaitlist,
    removeWaitlist,
    toggleBlockSlot,
    updateBookingStatus,
    getBarberStats
  };
})(window);
