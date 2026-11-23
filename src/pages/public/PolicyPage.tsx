import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useVibeStore } from '@/services/vibeStore';
import { formatBRL } from '@/config/brand';
import { Card, Button } from '@/components/ui/primitives';

export function PolicyPage() {
  const { state } = useVibeStore();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gold/15 text-gold">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Políticas &amp; Privacidade (LGPD)</h1>
          <p className="text-sm text-ink-muted">{state.barbershop.name}</p>
        </div>
      </div>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold text-ink">1. Sinal de Reserva via Pix</h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          Para garantir sua cadeira sem risco de horários ociosos, o sinal atual é de{' '}
          <strong className="text-ink">{formatBRL(state.settings.fixedDepositCents)}</strong>{' '}
          (abatido integralmente do valor do serviço no momento do atendimento).
        </p>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold text-ink">2. Cancelamento e Repasse</h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          {state.settings.cancellationPolicyText}
        </p>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold text-ink">3. Privacidade de Dados (LGPD)</h2>
        <p className="text-sm text-ink-muted leading-relaxed">
          Coletamos apenas os dados estritamente necessários para confirmar e gerenciar seu
          agendamento (nome, telefone e e-mail opcional). No Mural de Repasses, nenhum dado pessoal
          do cliente original é exposto publicamente.
        </p>
      </Card>

      <div>
        <Link to="/agendar">
          <Button variant="primary">Voltar para o agendamento</Button>
        </Link>
      </div>
    </div>
  );
}
