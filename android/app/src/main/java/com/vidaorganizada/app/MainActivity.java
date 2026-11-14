package com.vidaorganizada.app;

import android.content.res.Configuration;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BankNotificationPlugin.class);
        registerPlugin(OfflineReceiptOcrPlugin.class);
        registerPlugin(SystemAppearancePlugin.class);
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

