package com.vidaorganizada.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.lang.ref.WeakReference;
import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(name = "BankNotificationListener")
public class BankNotificationPlugin extends Plugin {
    private static WeakReference<BankNotificationPlugin> activeInstance = new WeakReference<>(null);

    @Override
    public void load() {
        super.load();
        activeInstance = new WeakReference<>(this);
    }

    public static void emitNotificationToJs(JSONObject item) {
        BankNotificationPlugin plugin = activeInstance.get();
        if (plugin == null || item == null) return;
        try {
            JSObject jsItem = JSObject.fromJSONObject(item);
            plugin.notifyListeners("bankNotificationReceived", jsItem);
        } catch (Exception ignored) {
            // Safe fallback when WebView is not active
        }
    }

    @PluginMethod
    public void isPermissionGranted(PluginCall call) {
        Context context = getContext();
        boolean granted = NotificationManagerCompat.getEnabledListenerPackages(context)
                .contains(context.getPackageName());
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void openNotificationAccessSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Não foi possível abrir as configurações de notificação.", e);
        }
    }

    @PluginMethod
    public void getPendingNotifications(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(
                BankNotificationListenerService.PREFS_NAME,
                Context.MODE_PRIVATE
        );
        String raw = prefs.getString(BankNotificationListenerService.KEY_QUEUE, "[]");
        JSObject ret = new JSObject();
        try {
            JSArray arr = new JSArray(raw);
            ret.put("notifications", arr);
        } catch (Exception e) {
            ret.put("notifications", new JSArray());
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void clearPendingNotifications(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(
                BankNotificationListenerService.PREFS_NAME,
                Context.MODE_PRIVATE
        );

        JSArray idsToRemove = call.getArray("ids");
        if (idsToRemove == null) {
            prefs.edit().putString(BankNotificationListenerService.KEY_QUEUE, "[]").apply();
            call.resolve();
            return;
        }

        Set<String> removeSet = new HashSet<>();
        for (int i = 0; i < idsToRemove.length(); i++) {
            String id = idsToRemove.optString(i, null);
            if (id != null) removeSet.add(id);
        }

        try {
            String raw = prefs.getString(BankNotificationListenerService.KEY_QUEUE, "[]");
            JSONArray existing = new JSONArray(raw);
            JSONArray remaining = new JSONArray();
            for (int i = 0; i < existing.length(); i++) {
                JSONObject item = existing.optJSONObject(i);
                if (item != null && !removeSet.contains(item.optString("id"))) {
                    remaining.put(item);
                }
            }
            prefs.edit().putString(BankNotificationListenerService.KEY_QUEUE, remaining.toString()).apply();
        } catch (Exception ignored) {
            prefs.edit().putString(BankNotificationListenerService.KEY_QUEUE, "[]").apply();
        }
        call.resolve();
    }
}
