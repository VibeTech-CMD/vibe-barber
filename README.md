# Vibe Barber ✂️

Plataforma web responsiva (PWA) de agendamento e gestão de barbearias — **Desenvolvido por [Vibetech](https://vibetech-cmd.github.io/VIBETECH/)**.

- **Prévia Online (GitHub Pages):** https://vibetech-cmd.github.io/vibe-barber/
- **Repositório:** https://github.com/VibeTech-CMD/vibe-barber

---

## Stack Tecnológica

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, React Router, React Hook Form + Zod, TanStack Query.
- **Backend (Supabase):** PostgreSQL com migrations versionadas (`supabase/migrations/`), constraint `btree_gist` anti-duplicidade de horários, Row Level Security (`0002_rls_policies.sql`), view pública de repasses com privacidade LGPD, `seed.sql` e Edge Function para webhook Pix (`supabase/functions/pix-webhook/`).
- **Testes:** Vitest + Testing Library + Playwright.
- **PWA:** `public/manifest.json`, `public/sw.js` e ícone vetorial.

---

## Funcionalidades (PRD v1.0)

1. **Página Pública:** vitrine da barbearia, serviços ativos, equipe, horários, política de cancelamento e rodapé permanente **Desenvolvido por Vibetech**.
2. **Fluxo de Agendamento Inteligente:** seleção de múltiplos serviços, cálculo automático de duração/preço/sinal, escolha de barbeiro (ou qualquer disponível), motor de disponibilidade com bloqueios e intervalos, validação Zod e checkout Pix demonstrativo (com simulação de pagamento e expiração).
3. **Área do Cliente:** Meus Agendamentos (códigos `#VB-XXXX`), cancelamento com registro de motivo, **Mural de Repasses** (anônimo — sem expor dados pessoais do titular original), **Fila de Espera** com detecção de compatibilidade e **Troca Atômica de Horários** entre clientes.
4. **Painel do Barbeiro (`/barbeiro`):** agenda individual, indicadores, conclusão de atendimento, registro de no-show e bloqueio de horários.
5. **Painel Administrativo (`/admin`):** Dashboard com KPIs reais, Agenda & Bloqueios, CRUD de Serviços e Barbeiros, CRM de Clientes, Financeiro sem dupla contagem de sinal + **Exportação CSV**, Feed de Atividades e Configurações + Reset de Dados Demo.

---

## Instalação Local

```bash
npm install
cp .env.example .env
npm run dev
```

### Testes & Build

```bash
npm test          # Testes unitários (Vitest)
npm run build     # Typecheck + Build de produção
npm run test:e2e  # Testes E2E (Playwright)
```

---

## Configuração do Supabase (Produção)

1. Crie um projeto no [Supabase](https://supabase.com/).
2. Execute as migrations em ordem:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_rls_policies.sql`
   - `supabase/seed.sql` (opcional para dados iniciais)
3. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no arquivo `.env`.
4. Para pagamentos Pix reais (Asaas / Mercado Pago), faça deploy da Edge Function `supabase/functions/pix-webhook/index.ts` e configure `PIX_WEBHOOK_SECRET`.

---

*Uma solução **Vibetech**.*
