package com.vidaorganizada.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.lang.ref.WeakReference;

@CapacitorPlugin(name = "SystemAppearance")
public class SystemAppearancePlugin extends Plugin {

    private static final String PREFS_NAME = "VidaOrganizadaSystemPrefs";
    private static final String KEY_THEME = "app_theme";
    private static final String KEY_BAR_COLOR = "bar_color";
    private static final String KEY_BG_COLOR = "bg_color";

    private static volatile WeakReference<SystemAppearancePlugin> sActiveInstance = new WeakReference<>(null);
    private static volatile boolean sLastKeyboardOpen = false;
    private static volatile int sLastKeyboardHeightCssPx = 0;

    @Override
    public void load() {
        super.load();
        sActiveInstance = new WeakReference<>(this);
        if (getActivity() instanceof AppCompatActivity) {
            reapplyLastTheme(
                (AppCompatActivity) getActivity(),
                getBridge() != null ? getBridge().getWebView() : null
            );
        }
    }

    @Override
    protected void handleOnDestroy() {
        SystemAppearancePlugin current = sActiveInstance.get();
        if (current == this) {
            sActiveInstance = new WeakReference<>(null);
        }
        super.handleOnDestroy();
    }

    public static void dispatchKeyboardState(boolean isOpen, int heightCssPx) {
        if (sLastKeyboardOpen == isOpen && sLastKeyboardHeightCssPx == heightCssPx) {
            return;
        }
        sLastKeyboardOpen = isOpen;
        sLastKeyboardHeightCssPx = heightCssPx;

        SystemAppearancePlugin instance = sActiveInstance.get();
        if (instance != null) {
            JSObject payload = new JSObject();
            payload.put("isOpen", isOpen);
            payload.put("height", heightCssPx);
            instance.notifyListeners("keyboardStateChange", payload, true);
        }
    }

    @PluginMethod
    public void getKeyboardState(PluginCall call) {
        JSObject payload = new JSObject();
        payload.put("isOpen", sLastKeyboardOpen);
        payload.put("height", sLastKeyboardHeightCssPx);
        call.resolve(payload);
    }

    @PluginMethod
    public void notifyAppReady(PluginCall call) {
        MainActivity.markAppReady();
        call.resolve();
    }

    @PluginMethod
    public void setTheme(PluginCall call) {
        String theme = call.getString("theme", "dark");
        String barColor = call.getString("barColor");
        String backgroundColor = call.getString("backgroundColor");

        boolean isLight = "light".equalsIgnoreCase(theme);
        String resolvedTheme = isLight ? "light" : "dark";
        String resolvedBarColor = (barColor != null && !barColor.isEmpty())
            ? barColor
            : (isLight ? "#FFFFFF" : "#1C1715");
        String resolvedBgColor = (backgroundColor != null && !backgroundColor.isEmpty())
            ? backgroundColor
            : (isLight ? "#FAF6F1" : "#141110");

        saveThemePrefs(getContext(), resolvedTheme, resolvedBarColor, resolvedBgColor);

        if (getActivity() instanceof AppCompatActivity) {
            AppCompatActivity activity = (AppCompatActivity) getActivity();
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            activity.runOnUiThread(() -> {
                applyThemeToActivity(activity, webView, resolvedTheme, resolvedBarColor, resolvedBgColor);
                call.resolve();
            });
        } else {
            call.resolve();
        }
    }

    private static void saveThemePrefs(Context context, String theme, String barColor, String bgColor) {
        if (context == null) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                .putString(KEY_THEME, theme)
                .putString(KEY_BAR_COLOR, barColor)
                .putString(KEY_BG_COLOR, bgColor)
                .apply();
        } catch (Exception ignored) {
            // Safe fallback
        }
    }

    public static void reapplyLastTheme(AppCompatActivity activity, WebView webView) {
        if (activity == null) return;
        String theme = "dark";
        String barColor = "#1C1715";
        String bgColor = "#141110";
        try {
            SharedPreferences prefs = activity.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            theme = prefs.getString(KEY_THEME, "dark");
            boolean isLight = "light".equalsIgnoreCase(theme);
            barColor = prefs.getString(KEY_BAR_COLOR, isLight ? "#FFFFFF" : "#1C1715");
            bgColor = prefs.getString(KEY_BG_COLOR, isLight ? "#FAF6F1" : "#141110");
        } catch (Exception ignored) {
            // Keep defaults
        }
        applyThemeToActivity(activity, webView, theme, barColor, bgColor);
    }

    @SuppressWarnings("deprecation")
    public static void applyThemeToActivity(
        AppCompatActivity activity,
        WebView webView,
        String theme,
        String barHex,
        String bgHex
    ) {
        if (activity == null) return;
        boolean isDark = !"light".equalsIgnoreCase(theme);

        int parsedBarColor;
        int parsedBgColor;
        try {
            parsedBarColor = Color.parseColor(barHex);
        } catch (Exception e) {
            parsedBarColor = Color.parseColor(isDark ? "#1C1715" : "#FFFFFF");
        }
        try {
            parsedBgColor = Color.parseColor(bgHex);
        } catch (Exception e) {
            parsedBgColor = Color.parseColor(isDark ? "#141110" : "#FAF6F1");
        }

        Window window = activity.getWindow();
        if (window != null) {
            View decorView = window.getDecorView();
            decorView.setBackgroundColor(parsedBarColor);

            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
            if (controller != null) {
                controller.setAppearanceLightStatusBars(!isDark);
                controller.setAppearanceLightNavigationBars(!isDark);
            }

            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
                window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
                window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                window.setStatusBarColor(parsedBarColor);
                window.setNavigationBarColor(parsedBarColor);
            }
        }

        if (webView != null) {
            webView.setBackgroundColor(parsedBgColor);
        }
    }
}
