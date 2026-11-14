import { Capacitor, SystemBars, SystemBarsStyle, registerPlugin } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

interface SystemAppearancePlugin {
  setTheme(options: {
    theme: 'light' | 'dark';
    barColor: string;
    backgroundColor: string;
  }): Promise<void>;
}

const SystemAppearance = registerPlugin<SystemAppearancePlugin>('SystemAppearance');

export async function syncNativeSystemBars(
  theme: 'light' | 'dark',
  isOnboarding: boolean
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const isDark = theme === 'dark';
  const backgroundColor = isDark ? '#09090b' : '#fafafa';
  const barColor = isOnboarding ? backgroundColor : isDark ? '#18181b' : '#ffffff';

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
