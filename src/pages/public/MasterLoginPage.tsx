import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { DEMO_MASTER_CREDENTIALS, useVibeStore } from '@/services/vibeStore';
import { Badge, Button, Card, Input, useToast } from '@/components/ui/primitives';

export function MasterLoginPage() {
  const { state, loginMaster } = useVibeStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (state.masterAuthenticated) {
    navigate('/admin', { replace: true });
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = loginMaster(email, password);
    if (res.ok) {
      toast('Bem-vindo ao Painel do Dono (Master)!', 'success');
      navigate('/admin', { replace: true });
    } else {
      setError(res.error || 'Credenciais inválidas.');
    }
  };

  const handleFillDemo = () => {
    setEmail(DEMO_MASTER_CREDENTIALS.email);
    setPassword(DEMO_MASTER_CREDENTIALS.password);
    setError('');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <Card className="space-y-6 border-gold/30">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gold/15 text-gold flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <Badge tone="gold">Acesso Restrito • Usuário Master</Badge>
          <h1 className="text-2xl font-extrabold text-ink">Área do Dono</h1>
          <p className="text-sm text-ink-muted">
            Apenas o proprietário da barbearia precisa de login. Clientes agendam livremente pelo
            CPF sem criar senha.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="masterEmail" className="block text-xs font-semibold text-ink-muted mb-1.5">
              E-mail do proprietário
            </label>
            <Input
              id="masterEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dono@vibebarber.com.br"
              required
            />
          </div>

          <div>
            <label htmlFor="masterPassword" className="block text-xs font-semibold text-ink-muted mb-1.5">
              Senha
            </label>
            <Input
              id="masterPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-xl bg-alert/15 border border-alert/35 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full">
            <ShieldCheck className="w-4 h-4" /> Entrar no Painel Master
          </Button>
        </form>

        {/* Demo helper for commercial presentations */}
        <div className="rounded-xl bg-deep border border-white/10 p-3.5 space-y-2 text-xs">
          <div className="font-semibold text-gold-light flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" /> Acesso de teste para demonstração
          </div>
          <div className="text-ink-muted font-mono">
            E-mail: {DEMO_MASTER_CREDENTIALS.email}
            <br />
            Senha: {DEMO_MASTER_CREDENTIALS.password}
          </div>
          <Button type="button" size="sm" variant="outline" className="w-full" onClick={handleFillDemo}>
            Preencher dados de demonstração
          </Button>
        </div>
      </Card>
    </div>
  );
}
