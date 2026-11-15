package com.vidaorganizada.app;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.content.res.Configuration;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.View;
import android.view.animation.DecelerateInterpolator;
import android.webkit.CookieManager;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final long MAX_SPLASH_HOLD_MS = 1500L;
    private static final long SPLASH_EXIT_DURATION_MS = 260L;
    private static volatile boolean sAppReady = false;

    public static void markAppReady() {
        sAppReady = true;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        final SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        final long launchStartMs = SystemClock.uptimeMillis();

        if (savedInstanceState == null) {
            sAppReady = false;
        }

        splashScreen.setKeepOnScreenCondition(
            () -> !sAppReady && (SystemClock.uptimeMillis() - launchStartMs) < MAX_SPLASH_HOLD_MS
        );

        new Handler(Looper.getMainLooper()).postDelayed(() -> sAppReady = true, MAX_SPLASH_HOLD_MS);

        splashScreen.setOnExitAnimationListener(splashScreenView -> {
            final View container = splashScreenView.getView();
            View iconView = null;
            try {
                iconView = splashScreenView.getIconView();
            } catch (Exception ignored) {
                // Safe fallback when OEM/compat layer omits iconView
            }

            final AnimatorSet exitSet = new AnimatorSet();
            final ObjectAnimator fadeOut = ObjectAnimator.ofFloat(container, View.ALPHA, 1f, 0f);
            if (iconView != null) {
                final ObjectAnimator scaleX = ObjectAnimator.ofFloat(iconView, View.SCALE_X, 1f, 1.08f);
                final ObjectAnimator scaleY = ObjectAnimator.ofFloat(iconView, View.SCALE_Y, 1f, 1.08f);
                exitSet.playTogether(fadeOut, scaleX, scaleY);
            } else {
                exitSet.play(fadeOut);
            }

            exitSet.setDuration(SPLASH_EXIT_DURATION_MS);
            exitSet.setInterpolator(new DecelerateInterpolator(1.6f));
            exitSet.addListener(new AnimatorListenerAdapter() {
                @Override
                public void onAnimationEnd(Animator animation) {
                    splashScreenView.remove();
                }

                @Override
                public void onAnimationCancel(Animator animation) {
                    splashScreenView.remove();
                }
            });
            exitSet.start();
        });

        registerPlugin(BankNotificationPlugin.class);
        registerPlugin(OfflineReceiptOcrPlugin.class);
        registerPlugin(SystemAppearancePlugin.class);
        registerPlugin(BiometricLockPlugin.class);
        super.onCreate(savedInstanceState);

        WebView mainWebView = null;
        try {
            mainWebView = this.bridge.getWebView();
            if (mainWebView != null) {
                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(mainWebView, true);
            }
        } catch (Exception e) {
            // Safe fallback
        }

        SystemAppearancePlugin.reapplyLastTheme(this, mainWebView);

        final View contentRoot = findViewById(android.R.id.content);
        if (contentRoot != null) {
            ViewCompat.setOnApplyWindowInsetsListener(contentRoot, (view, windowInsets) -> {
                final Insets imeInsets = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
                final Insets navInsets = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars());
                final boolean isImeVisible =
                    windowInsets.isVisible(WindowInsetsCompat.Type.ime()) &&
                    imeInsets.bottom > navInsets.bottom;
                final float density = Math.max(1f, getResources().getDisplayMetrics().density);
                final int keyboardCssPx = isImeVisible
                    ? Math.max(0, Math.round((imeInsets.bottom - navInsets.bottom) / density))
                    : 0;
                SystemAppearancePlugin.dispatchKeyboardState(isImeVisible, keyboardCssPx);
                return ViewCompat.onApplyWindowInsets(view, windowInsets);
            });
            ViewCompat.requestApplyInsets(contentRoot);
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        try {
            final WebView mainWebView = this.bridge != null ? this.bridge.getWebView() : null;
            getWindow().getDecorView().post(() -> SystemAppearancePlugin.reapplyLastTheme(this, mainWebView));
        } catch (Exception ignored) {
            // Safe fallback
        }
    }
}
