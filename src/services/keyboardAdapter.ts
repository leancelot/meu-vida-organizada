import {
  getNativeKeyboardState,
  NativeKeyboardState,
  subscribeNativeKeyboardState,
} from './systemAppearanceBridge';

export interface KeyboardMetricsInput {
  windowInnerHeight: number;
  visualViewportHeight: number;
  visualViewportOffsetTop: number;
  baselineWindowHeight: number;
  nativeImeOpen?: boolean;
  nativeImeHeightPx?: number;
}

export interface KeyboardMetrics {
  isKeyboardOpen: boolean;
  keyboardOverlayInsetPx: number;
  visibleViewportHeightPx: number;
}

const KEYBOARD_OPEN_THRESHOLD_PX = 135;

const NON_TEXT_INPUT_TYPES = new Set([
  'checkbox',
  'radio',
  'file',
  'button',
  'submit',
  'reset',
  'range',
  'color',
  'hidden',
]);

export function computeViewportKeyboardMetrics(input: KeyboardMetricsInput): KeyboardMetrics {
  const winHeight = Math.max(0, Math.round(input.windowInnerHeight));
  const vvHeight = Math.max(
    0,
    Math.round(input.visualViewportHeight > 0 ? input.visualViewportHeight : winHeight)
  );
  const vvOffsetTop = Math.max(0, Math.round(input.visualViewportOffsetTop || 0));
  const baseline = Math.max(winHeight, vvHeight, Math.round(input.baselineWindowHeight || 0));
  const nativeOpen = Boolean(input.nativeImeOpen);
  const nativeHeight = nativeOpen ? Math.max(0, Math.round(input.nativeImeHeightPx || 0)) : 0;

  // Amount the WebView/browser layout viewport itself already shrank (e.g. adjustResize)
  const layoutShrunkBy = Math.max(0, baseline - winHeight);
  // Amount visualViewport shrank inside layout viewport (e.g. mobile Chrome / interactive-widget)
  const visualDeltaInsideLayout = Math.max(0, winHeight - vvHeight - vvOffsetTop);
  // Remaining native IME height not already accounted for by layout viewport shrink
  const remainingNativeOverlap = nativeOpen ? Math.max(0, nativeHeight - layoutShrunkBy) : 0;

  const keyboardOverlayInsetPx = Math.max(visualDeltaInsideLayout, remainingNativeOverlap);

  const rawVisibleHeight = Math.min(winHeight, vvHeight);
  const visibleViewportHeightPx = Math.max(
    240,
    rawVisibleHeight - Math.max(0, remainingNativeOverlap - visualDeltaInsideLayout)
  );

  const totalShrinkFromBaseline = Math.max(
    baseline - visibleViewportHeightPx,
    keyboardOverlayInsetPx + layoutShrunkBy
  );

  const isKeyboardOpen =
    (nativeOpen && (nativeHeight >= 80 || totalShrinkFromBaseline >= KEYBOARD_OPEN_THRESHOLD_PX)) ||
    totalShrinkFromBaseline >= KEYBOARD_OPEN_THRESHOLD_PX;

  return {
    isKeyboardOpen,
    keyboardOverlayInsetPx: isKeyboardOpen ? keyboardOverlayInsetPx : 0,
    visibleViewportHeightPx: isKeyboardOpen ? visibleViewportHeightPx : rawVisibleHeight,
  };
}

export function isTextEntryElement(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = ((el as HTMLInputElement).type || 'text').toLowerCase();
    return !NON_TEXT_INPUT_TYPES.has(type);
  }
  return false;
}

export function initKeyboardViewportAdapter(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  let disposed = false;
  let nativeState: NativeKeyboardState = { isOpen: false, height: 0 };
  let baselineHeight = Math.max(
    window.innerHeight || 0,
    window.visualViewport?.height || 0
  );
  let lastOrientation =
    window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  let scrollTimers: number[] = [];

  const clearScrollTimers = () => {
    scrollTimers.forEach((id) => window.clearTimeout(id));
    scrollTimers = [];
  };

  const applyMetrics = () => {
    if (disposed) return;

    const currentOrientation =
      window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    if (currentOrientation !== lastOrientation) {
      lastOrientation = currentOrientation;
      baselineHeight = Math.max(
        window.innerHeight || 0,
        window.visualViewport?.height || 0
      );
    }

    const winHeight = window.innerHeight || 0;
    const vvHeight = window.visualViewport?.height ?? winHeight;
    const vvOffsetTop = window.visualViewport?.offsetTop ?? 0;

    if (!nativeState.isOpen && Math.max(winHeight, vvHeight) > baselineHeight) {
      baselineHeight = Math.max(winHeight, vvHeight);
    }

    const metrics = computeViewportKeyboardMetrics({
      windowInnerHeight: winHeight,
      visualViewportHeight: vvHeight,
      visualViewportOffsetTop: vvOffsetTop,
      baselineWindowHeight: baselineHeight,
      nativeImeOpen: nativeState.isOpen,
      nativeImeHeightPx: nativeState.height,
    });

    // If keyboard is genuinely closed, recalibrate baseline to avoid drift
    if (!metrics.isKeyboardOpen && winHeight > 0) {
      baselineHeight = Math.max(winHeight, vvHeight);
    }

    const root = document.documentElement;
    root.dataset.keyboardOpen = metrics.isKeyboardOpen ? 'true' : 'false';
    root.style.setProperty('--keyboard-inset', `${metrics.keyboardOverlayInsetPx}px`);
    root.style.setProperty(
      '--app-visible-height',
      metrics.visibleViewportHeightPx > 0 ? `${metrics.visibleViewportHeightPx}px` : '100dvh'
    );
  };

  const scheduleFocusedInputScroll = (target: HTMLElement) => {
    clearScrollTimers();
    const runScroll = () => {
      if (disposed) return;
      if (document.activeElement !== target) return;
      try {
        target.scrollIntoView({
          block: 'center',
          inline: 'nearest',
          behavior: 'smooth',
        });
      } catch {
        // Fallback for older WebViews
        try {
          target.scrollIntoView(false);
        } catch {
          // ignore
        }
      }
    };

    scrollTimers.push(window.setTimeout(runScroll, 120));
    scrollTimers.push(window.setTimeout(runScroll, 320));
  };

  const handleViewportChange = () => {
    applyMetrics();
  };

  const handleFocusIn = (event: FocusEvent) => {
    const target = event.target as Element | null;
    if (!isTextEntryElement(target)) return;
    applyMetrics();
    scheduleFocusedInputScroll(target);
  };

  const handleFocusOut = () => {
    clearScrollTimers();
    window.setTimeout(() => {
      if (!disposed) applyMetrics();
    }, 80);
  };

  applyMetrics();

  window.addEventListener('resize', handleViewportChange);
  window.addEventListener('orientationchange', handleViewportChange);
  window.visualViewport?.addEventListener('resize', handleViewportChange);
  window.visualViewport?.addEventListener('scroll', handleViewportChange);
  document.addEventListener('focusin', handleFocusIn, true);
  document.addEventListener('focusout', handleFocusOut, true);

  let unsubscribeNative: (() => void) | null = null;
  void getNativeKeyboardState().then((initial) => {
    if (!disposed && initial) {
      nativeState = initial;
      applyMetrics();
    }
  });
  void subscribeNativeKeyboardState((nextState) => {
    if (disposed) return;
    nativeState = nextState;
    applyMetrics();
    if (nextState.isOpen && isTextEntryElement(document.activeElement)) {
      scheduleFocusedInputScroll(document.activeElement);
    }
  }).then((unsub) => {
    if (disposed) {
      if (unsub) unsub();
    } else {
      unsubscribeNative = unsub;
    }
  });

  return () => {
    disposed = true;
    clearScrollTimers();
    window.removeEventListener('resize', handleViewportChange);
    window.removeEventListener('orientationchange', handleViewportChange);
    window.visualViewport?.removeEventListener('resize', handleViewportChange);
    window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    document.removeEventListener('focusin', handleFocusIn, true);
    document.removeEventListener('focusout', handleFocusOut, true);
    if (unsubscribeNative) unsubscribeNative();
  };
}
