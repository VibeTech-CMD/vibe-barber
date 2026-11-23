import { test, expect } from '@playwright/test';

test.describe('Vibe Barber — Cenários E2E', () => {
  test('exibe página pública com branding Vibe Barber e rodapé obrigatório Vibetech', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Seu estilo. Seu horário.')).toBeVisible();
    await expect(page.getByText('Desenvolvido por')).toBeVisible();
    await expect(page.getByRole('link', { name: /Vibetech/i })).toBeVisible();
  });

  test('fluxo completo de agendamento com pagamento Pix demonstrativo', async ({ page }) => {
    await page.goto('/#/agendar');
    await expect(page.getByText('1. Escolha o(s) serviço(s)')).toBeVisible();
    const firstSlot = page.locator('button.font-mono').first();
    await firstSlot.click();
    await page.getByRole('button', { name: /Confirmar e Pagar Sinal Pix/i }).click();
    await expect(page.getByText(/Pagamento Simulado/i)).toBeVisible();
    await page.getByRole('button', { name: /Simular Pagamento Confirmado/i }).click();
    await expect(page.getByText('Meus Agendamentos')).toBeVisible();
  });
});
