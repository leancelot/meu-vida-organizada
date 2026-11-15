import { describe, expect, it } from 'vitest';
import {
  detectBankNameFromText,
  extractBRLAmount,
  parseBankNotificationText,
} from '../bankNotificationParser';

describe('bankNotificationParser', () => {
  it('extrai corretamente valores brasileiros ignorando final de cartão e horários', () => {
    expect(
      extractBRLAmount('Compra aprovada no cartão final 4821 em 14/11 às 18:30 de R$ 1.250,90')
    ).toBe(1250.9);
    expect(extractBRLAmount('Pix enviado no valor de 84,50 para Padaria')).toBe(84.5);
    expect(extractBRLAmount('Seu cartão terminado em 9012 teve compra de 45,00')).toBe(45);
  });

  it('identifica bancos brasileiros conhecidos', () => {
    expect(detectBankNameFromText('Nubank: Compra aprovada')).toBe('Nubank');
    expect(detectBankNameFromText('Banco Inter - Pix recebido')).toBe('Banco Inter');
    expect(detectBankNameFromText('Itaú Unibanco: Compra no crédito')).toBe('Itaú');
    expect(detectBankNameFromText('Notificação do Mercado Pago')).toBe('Mercado Pago');
  });

  it('interpreta compra aprovada no cartão de crédito com estabelecimento e categoria', () => {
    const parsed = parseBankNotificationText({
      title: 'Compra aprovada',
      rawText: 'Nubank: Compra no crédito aprovada de R$ 134,80 em SUPERMERCADO EXTRA em 14/11/2026.',
      timestamp: new Date('2026-11-14T15:00:00Z').getTime(),
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('despesa');
    expect(parsed?.amount).toBe(134.8);
    expect(parsed?.bankName).toBe('Nubank');
    expect(parsed?.paymentMethod).toBe('cartao_credito');
    expect(parsed?.category).toBe('alimentacao');
    expect(parsed?.title).toContain('SUPERMERCADO EXTRA');
    expect(parsed?.date).toBe('2026-11-14');
  });

  it('interpreta Pix recebido e estorno como receita', () => {
    const pix = parseBankNotificationText({
      rawText: 'Banco Inter: Você recebeu um Pix de R$ 450,00 de Maria Silva.',
      timestamp: new Date('2026-11-14T12:00:00Z').getTime(),
    });

    expect(pix).not.toBeNull();
    expect(pix?.type).toBe('receita');
    expect(pix?.amount).toBe(450);
    expect(pix?.paymentMethod).toBe('pix');
    expect(pix?.title).toBe('Recebido de Maria Silva');

    const refund = parseBankNotificationText({
      rawText: 'Nubank: Estorno aprovado de R$ 79,90 em Amazon.',
    });
    expect(refund?.type).toBe('receita');
    expect(refund?.amount).toBe(79.9);
  });

  it('descarta notificações de segurança, OTP, faturas fechadas e promoções', () => {
    expect(
      parseBankNotificationText({
        rawText: 'Seu código de verificação OTP é 482910. Não compartilhe.',
      })
    ).toBeNull();

    expect(
      parseBankNotificationText({
        rawText: 'Sua fatura fechada de R$ 1.890,00 vence em 20/11.',
      })
    ).toBeNull();

    expect(
      parseBankNotificationText({
        rawText: 'Empréstimo pré-aprovado de R$ 15.000,00 disponível no app!',
      })
    ).toBeNull();
  });

  it('gera assinaturas idênticas para notificações duplicadas dentro da janela', () => {
    const first = parseBankNotificationText({
      rawText: 'Itaú: Compra aprovada no débito de R$ 28,00 em Uber em 14/11/2026.',
    });
    const duplicate = parseBankNotificationText({
      rawText: 'Itaú: Compra aprovada no débito de R$ 28,00 em Uber em 14/11/2026.',
    });

    expect(first?.signature).toBeTruthy();
    expect(first?.signature).toBe(duplicate?.signature);
  });
});
