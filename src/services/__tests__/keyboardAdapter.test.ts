import { afterEach, describe, expect, it } from 'vitest';
import { computeViewportKeyboardMetrics, isTextEntryElement } from '../keyboardAdapter';

describe('computeViewportKeyboardMetrics', () => {
  it('não aplica padding duplicado quando o WebView já encolheu com adjustResize (Android 10-14)', () => {
    const metrics = computeViewportKeyboardMetrics({
      baselineWindowHeight: 840,
      windowInnerHeight: 530,
      visualViewportHeight: 530,
      visualViewportOffsetTop: 0,
      nativeImeOpen: true,
      nativeImeHeightPx: 310,
    });

    expect(metrics.isKeyboardOpen).toBe(true);
    expect(metrics.keyboardOverlayInsetPx).toBe(0);
    expect(metrics.visibleViewportHeightPx).toBe(530);
  });

  it('calcula o inset completo quando Android 15+ edge-to-edge mantém windowInnerHeight cheio', () => {
    const metrics = computeViewportKeyboardMetrics({
      baselineWindowHeight: 840,
      windowInnerHeight: 840,
      visualViewportHeight: 840,
      visualViewportOffsetTop: 0,
      nativeImeOpen: true,
      nativeImeHeightPx: 310,
    });

    expect(metrics.isKeyboardOpen).toBe(true);
    expect(metrics.keyboardOverlayInsetPx).toBe(310);
    expect(metrics.visibleViewportHeightPx).toBe(530);
  });

  it('calcula apenas a diferença restante quando há encolhimento parcial de layout', () => {
    const metrics = computeViewportKeyboardMetrics({
      baselineWindowHeight: 840,
      windowInnerHeight: 740,
      visualViewportHeight: 740,
      visualViewportOffsetTop: 0,
      nativeImeOpen: true,
      nativeImeHeightPx: 300,
    });

    expect(metrics.isKeyboardOpen).toBe(true);
    expect(metrics.keyboardOverlayInsetPx).toBe(200);
    expect(metrics.visibleViewportHeightPx).toBe(540);
  });

  it('detecta teclado aberto via visualViewport em navegadores móveis sem bridge nativa', () => {
    const metrics = computeViewportKeyboardMetrics({
      baselineWindowHeight: 840,
      windowInnerHeight: 840,
      visualViewportHeight: 520,
      visualViewportOffsetTop: 0,
    });

    expect(metrics.isKeyboardOpen).toBe(true);
    expect(metrics.keyboardOverlayInsetPx).toBe(320);
    expect(metrics.visibleViewportHeightPx).toBe(520);
  });

  it('ignora variações pequenas de barra do sistema quando o teclado está fechado', () => {
    const metrics = computeViewportKeyboardMetrics({
      baselineWindowHeight: 840,
      windowInnerHeight: 805,
      visualViewportHeight: 805,
      visualViewportOffsetTop: 0,
      nativeImeOpen: false,
      nativeImeHeightPx: 0,
    });

    expect(metrics.isKeyboardOpen).toBe(false);
    expect(metrics.keyboardOverlayInsetPx).toBe(0);
    expect(metrics.visibleViewportHeightPx).toBe(805);
  });
});

describe('isTextEntryElement', () => {
  const originalHTMLElement = (globalThis as any).HTMLElement;

  afterEach(() => {
    (globalThis as any).HTMLElement = originalHTMLElement;
  });

  it('identifica campos de texto e exclui checkboxes/botões', () => {
    class MockHTMLElement {
      tagName: string;
      type: string;
      isContentEditable: boolean;
      constructor(tagName: string, type = 'text', isContentEditable = false) {
        this.tagName = tagName;
        this.type = type;
        this.isContentEditable = isContentEditable;
      }
    }
    (globalThis as any).HTMLElement = MockHTMLElement;

    expect(isTextEntryElement(new MockHTMLElement('INPUT', 'text') as unknown as Element)).toBe(true);
    expect(isTextEntryElement(new MockHTMLElement('INPUT', 'number') as unknown as Element)).toBe(true);
    expect(isTextEntryElement(new MockHTMLElement('TEXTAREA') as unknown as Element)).toBe(true);
    expect(isTextEntryElement(new MockHTMLElement('SELECT') as unknown as Element)).toBe(true);
    expect(isTextEntryElement(new MockHTMLElement('DIV', '', true) as unknown as Element)).toBe(true);

    expect(isTextEntryElement(new MockHTMLElement('INPUT', 'checkbox') as unknown as Element)).toBe(false);
    expect(isTextEntryElement(new MockHTMLElement('INPUT', 'date') as unknown as Element)).toBe(true);
    expect(isTextEntryElement(new MockHTMLElement('BUTTON') as unknown as Element)).toBe(false);
    expect(isTextEntryElement(null)).toBe(false);
  });
});
