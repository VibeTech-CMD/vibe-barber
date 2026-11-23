# Vibe Barber ✂️

Web App responsivo (PWA) para agendamento dinâmico de barbearia com **sinal via Pix**, **repasse de horários (fila de espera)** e **troca de horários entre clientes**.

## Prévia Online (GitHub Pages)
Acesse diretamente pelo navegador (celular ou computador):
- **Link:** https://vibetech-cmd.github.io/vibe-barber/

---

## Principais Funcionalidades

### Área do Cliente
- **Agendamento em 4 passos:** escolha serviço, barbeiro (ou qualquer disponível), dia e horário livre em tempo real.
- **Sinal via Pix (Anti-Falta):** reserva bloqueada por 10 minutos com QR Code, Pix Copia e Cola e valor do sinal (ex: R$ 10) abatido do valor total do corte.
- **Repasse de Horário & Fila de Espera:** teve um imprevisto? Disponibilize seu horário no mural para outro cliente assumir pagando o sinal — você recupera seu sinal e o barbeiro não fica no prejuízo.
- **Troca de Horários entre Clientes:** proponha troca de horário diretamente com outro cliente confirmado; ao aceitar, a agenda atualiza os dois automaticamente mantendo o sinal pago.

### Painel do Barbeiro
- **Indicadores do Dia:** sinais garantidos via Pix, valor restante a receber na cadeira, taxa de ocupação e vagas salvas por repasses/trocas.
- **Agenda em Tempo Real:** bloquear/liberar horários, aprovar Pix manualmente, concluir atendimento ou registrar falta (retendo o sinal).
- **Configurações:** personalizar nome da barbearia, valor do sinal e chave Pix, além de resetar os dados de demonstração.

---

## Como testar a demonstração
1. No topo da tela, alterne entre **Cliente** e **Barbeiro**.
2. No modo **Cliente**, use o seletor **Logado como** para alternar entre perfis (ex: *Lucas Mendes*, *Rafael Souza*, *Matheus Oliveira*) e testar propostas de troca e repasse em tempo real.
3. No checkout Pix, clique em **Simular Pagamento Confirmado** para concluir a reserva instantaneamente.
