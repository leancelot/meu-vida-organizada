import { Capacitor, PluginListenerHandle, SystemBars, SystemBarsStyle, registerPlugin } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export interface NativeKeyboardState {
  isOpen: boolean;
  height: number;
}

interface SystemAppearancePlugin {
  notifyAppReady(): Promise<void>;
  getKeyboardState(): Promise<NativeKeyboardState>;
  setTheme(options: {
    theme: 'light' | 'dark';
    barColor: string;
    backgroundColor: string;
  }): Promise<void>;
  addListener(
    eventName: 'keyboardStateChange',
    listenerFunc: (state: NativeKeyboardState) => void
  ): Promise<PluginListenerHandle>;
}

const SystemAppearance = registerPlugin<SystemAppearancePlugin>('SystemAppearance');

export async function notifyNativeAppReady(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SystemAppearance.notifyAppReady();
  } catch {
    // Safe fallback when plugin is not present
  }
}

export async function getNativeKeyboardState(): Promise<NativeKeyboardState | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    return await SystemAppearance.getKeyboardState();
  } catch {
    return null;
  }
}

export async function subscribeNativeKeyboardState(
  onChange: (state: NativeKeyboardState) => void
): Promise<(() => void) | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const handle = await SystemAppearance.addListener('keyboardStateChange', onChange);
    return () => {
      handle.remove().catch(() => {});
    };
  } catch {
    return null;
  }
}

export async function syncNativeSystemBars(
  theme: 'light' | 'dark',
  isOnboarding: boolean
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const isDark = theme === 'dark';
  const backgroundColor = isDark ? '#141110' : '#FAF6F1';
  const barColor = isOnboarding ? backgroundColor : isDark ? '#1C1715' : '#FFFFFF';

  try {
    await SystemBars.setStyle({
      style: isDark ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
    });
  } catch {
    // Ignore on platforms where SystemBars plugin is unavailable
  }

  try {
    await StatusBar.setStyle({
      style: isDark ? Style.Dark : Style.Light,
    });
    await StatusBar.setBackgroundColor({ color: barColor });
  } catch {
    // Ignore on Android 15+ where setBackgroundColor may be restricted
  }

  try {
    await SystemAppearance.setTheme({
      theme,
      barColor,
      backgroundColor,
    });
  } catch {
    // Safe fallback when plugin is not present
  }
}
