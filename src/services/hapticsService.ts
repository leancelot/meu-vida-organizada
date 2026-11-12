/**
 * Haptics Service para feedback tátil nativo no Android.
 * Proporciona a sensação física de um aplicativo de categoria AAA.
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const hapticImpactLight = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // ignore
  }
};

export const hapticImpactMedium = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    // ignore
  }
};

export const hapticSuccess = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // ignore
  }
};

export const hapticWarning = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch {
    // ignore
  }
};

export const hapticSelection = async () => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.selectionStart();
    await Haptics.selectionEnd();
  } catch {
    // ignore
  }
};
