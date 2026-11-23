/* ==========================================================================
   BarberSync — Pix Simulated Payment & Deterministic SVG QR Generator
   Isolado em camada própria para facilitar futura integração com Mercado Pago / Asaas
   ========================================================================== */

(function (global) {
  function formatCurrency(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function padLen(str) {
    return String(str.length).padStart(2, '0');
  }

  function buildPixPayload({ pixKey, receiver, city, amount, txid }) {
    const cleanReceiver = (receiver || 'VIBE BARBER').toUpperCase().slice(0, 25);
    const cleanCity = (city || 'SAO PAULO').toUpperCase().slice(0, 15);
    const cleanKey = (pixKey || 'pagamentos@vibebarber.com.br').trim();
    const amountStr = Number(amount || 10).toFixed(2);
    const cleanTx = (txid || 'VB0001').replace(/[^A-Z0-9]/gi, '').slice(0, 20) || 'VB0001';

    const gui = '0014BR.GOV.BCB.PIX';
    const keyField = `01${padLen(cleanKey)}${cleanKey}`;
    const merchantAcc = `26${padLen(gui + keyField)}${gui}${keyField}`;

    const parts = [
      '000201',
      merchantAcc,
      '52040000',
      '5303986',
      `54${padLen(amountStr)}${amountStr}`,
      '5802BR',
      `59${padLen(cleanReceiver)}${cleanReceiver}`,
      `60${padLen(cleanCity)}${cleanCity}`,
      `62${padLen('05' + padLen(cleanTx) + cleanTx)}05${padLen(cleanTx)}${cleanTx}`,
      '6304'
    ];

    const raw = parts.join('');
    // Simple deterministic checksum (CRC-like 4 hex chars) for realistic MVP payload
    let hash = 0xffff;
    for (let i = 0; i < raw.length; i++) {
      hash ^= raw.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        hash = (hash & 0x8000) ? ((hash << 1) ^ 0x1021) : (hash << 1);
        hash &= 0xffff;
      }
    }
    return raw + hash.toString(16).toUpperCase().padStart(4, '0');
  }

  /**
   * Renders a crisp, deterministic QR-style matrix SVG for MVP checkout.
   * In production, replace with the QR image/base64 returned by Mercado Pago / Asaas.
   */
  function generateQrSvg(payload) {
    const size = 21;
    const cells = Array.from({ length: size }, () => Array(size).fill(false));

    function drawFinder(r0, c0) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          cells[r0 + r][c0 + c] = isOuter || isInner;
        }
      }
    }

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Deterministic pseudo-random fill based on payload string
    let seed = 2166136261;
    for (let i = 0; i < payload.length; i++) {
      seed ^= payload.charCodeAt(i);
      seed = Math.imul(seed, 16777619) >>> 0;
    }

    function isReserved(r, c) {
      if (r < 8 && c < 8) return true;
      if (r < 8 && c >= size - 8) return true;
      if (r >= size - 8 && c < 8) return true;
      return false;
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (isReserved(r, c)) continue;
        if (r === 6 || c === 6) {
          cells[r][c] = (r + c) % 2 === 0;
          continue;
        }
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        cells[r][c] = (seed & 0x7) < 4;
      }
    }

    let rects = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (cells[r][c]) {
          rects += `<rect x="${c + 1}" y="${r + 1}" width="1" height="1" rx="0.12" fill="#0B0D10"/>`;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size + 2} ${size + 2}" width="168" height="168" shape-rendering="crispEdges">
      <rect width="${size + 2}" height="${size + 2}" fill="#FFFFFF"/>
      ${rects}
    </svg>`;
  }

  function formatCountdown(msRemaining) {
    const totalSec = Math.max(0, Math.floor(msRemaining / 1000));
    const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const sec = String(totalSec % 60).padStart(2, '0');
    return `${min}:${sec}`;
  }

  global.BarberSync = global.BarberSync || {};
  global.BarberSync.Pix = {
    formatCurrency,
    buildPixPayload,
    generateQrSvg,
    formatCountdown
  };
})(window);
