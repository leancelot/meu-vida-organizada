import { describe, expect, it } from 'vitest';
import { parseReceiptOcrText } from '../offlineReceiptOcr';

describe('offlineReceiptOcr.parseReceiptOcrText', () => {
  it('prioriza Valor a Pagar sobre tributos aproximados, descontos e troco em NFC-e', () => {
    const sampleReceipt = `
      DANFE NFC-e - Documento Auxiliar
      SUPERMERCADO BOM PRECO LTDA
      CNPJ: 12.345.678/0001-90
      Rua das Flores, 120 - Centro
      ARROZ INTEGRAL 5KG 29,90
      CAFE TORRADO 18,50
      SUBTOTAL 48,40
      DESCONTO 3,40
      VALOR A PAGAR R$ 45,00
      CARTAO DE CREDITO 45,00
      TROCO 0,00
      Val Aprox Tributos R$ 11,20 (Lei 12.741)
      Emissao: 14/11/2026 19:42:10
      Chave de Acesso 35261112345678000190650010000123451000123456
    `;

    const parsed = parseReceiptOcrText(sampleReceipt);
    expect(parsed).not.toBeNull();
    expect(parsed?.title).toBe('SUPERMERCADO BOM PRECO LTDA');
    expect(parsed?.amount).toBe(45);
    expect(parsed?.date).toBe('2026-11-14');
    expect(parsed?.category).toBe('alimentacao');
    expect(parsed?.paymentMethod).toBe('cartao_credito');
    expect(parsed?.notes).not.toContain('35261112345678000190650010000123451000123456');
  });

  it('reconhece data ISO e pagamento via Pix em farmácia', () => {
    const pharmacyReceipt = `
      DROGARIA SAO PAULO S.A.
      CUPOM FISCAL ELETRONICO SAT
      MEDICAMENTO GENERICO 62,40
      TOTAL 62,40
      PIX QR CODE 62,40
      2026-11-10
    `;

    const parsed = parseReceiptOcrText(pharmacyReceipt);
    expect(parsed).not.toBeNull();
    expect(parsed?.title).toBe('DROGARIA SAO PAULO S.A');
    expect(parsed?.amount).toBe(62.4);
    expect(parsed?.date).toBe('2026-11-10');
    expect(parsed?.category).toBe('saude');
    expect(parsed?.paymentMethod).toBe('pix');
  });

  it('reconhece abastecimento em posto de combustível e pagamento no débito', () => {
    const fuelReceipt = `
      AUTO POSTO IPIRANGA CENTRO
      GASOLINA COMUM 30L 185,70
      Valor Total 185,70
      Cartao Debito Visa
      12/11/2026
    `;

    const parsed = parseReceiptOcrText(fuelReceipt);
    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(185.7);
    expect(parsed?.category).toBe('transporte');
    expect(parsed?.paymentMethod).toBe('cartao_debito');
    expect(parsed?.date).toBe('2026-11-12');
  });

  it('retorna null para texto vazio ou ilegível sem valores', () => {
    expect(parseReceiptOcrText('')).toBeNull();
    expect(parseReceiptOcrText('   \n  ')).toBeNull();
    expect(parseReceiptOcrText('abc')).toBeNull();
  });
});
