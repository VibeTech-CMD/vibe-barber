export interface PixChargeRequest {
  appointmentCode: string;
  amountCents: number;
  pixKey: string;
  receiverName: string;
}

export interface PixChargeResponse {
  provider: 'demo_pix' | 'asaas' | 'mercadopago';
  externalId: string;
  demoCode: string;
  isSimulated: boolean;
  qrSvg: string;
}

export interface PaymentProvider {
  createPixCharge(req: PixChargeRequest): PixChargeResponse;
}

function generateDemoQrSvg(seedText: string): string {
  const size = 21;
  const cells = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        cells[r0 + r][c0 + c] = isOuter || isInner;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  const isReserved = (r: number, c: number) =>
    (r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isReserved(r, c)) continue;
      if (r === 6 || c === 6) {
        cells[r][c] = (r + c) % 2 === 0;
        continue;
      }
      hash = (Math.imul(hash, 1664525) + 1013904223) >>> 0;
      cells[r][c] = (hash & 0x7) < 4;
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

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size + 2} ${size + 2}" width="176" height="176" shape-rendering="crispEdges"><rect width="${size + 2}" height="${size + 2}" fill="#FFFFFF"/>${rects}</svg>`;
}

export class DemoPixProvider implements PaymentProvider {
  createPixCharge(req: PixChargeRequest): PixChargeResponse {
    const amount = (req.amountCents / 100).toFixed(2);
    const externalId = `DEMO-PIX-${req.appointmentCode}-${Date.now().toString().slice(-4)}`;
    // Clearly marked as simulated per PRD Section 9.3
    const demoCode = `DEMO.PIX.VIBEBARBER|REF:${req.appointmentCode}|VALOR:BRL${amount}|CHAVE:${req.pixKey}|AMBIENTE:SIMULADO`;
    return {
      provider: 'demo_pix',
      externalId,
      demoCode,
      isSimulated: true,
      qrSvg: generateDemoQrSvg(demoCode),
    };
  }
}

export const pixProvider: PaymentProvider = new DemoPixProvider();
