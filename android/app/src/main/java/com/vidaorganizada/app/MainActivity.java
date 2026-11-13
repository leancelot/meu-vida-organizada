package com.vidaorganizada.app;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BankNotificationPlugin.class);
        super.onCreate(savedInstanceState);

        try {
            WebView mainWebView = this.bridge.getWebView();
            if (mainWebView != null) {
                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(mainWebView, true);
            }
        } catch (Exception e) {
            // Safe fallback
        }
    }
}

