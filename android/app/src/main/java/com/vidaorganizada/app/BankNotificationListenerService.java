package com.vidaorganizada.app;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

public class BankNotificationListenerService extends NotificationListenerService {
    public static final String PREFS_NAME = "vidaorganizada_bank_prefs";
    public static final String KEY_QUEUE = "pending_bank_notifications";
    public static final String KEY_RECENT = "recent_notification_hashes";
    private static final int MAX_QUEUE_SIZE = 100;
    private static final long DEDUPE_WINDOW_MS = 90_000L;

    private static final Pattern MONEY_PATTERN =
            Pattern.compile("(?:R\\$\\s*|\\bvalor\\s+de\\s+)\\d+(?:[.,]\\d{1,3})*(?:,\\d{2})?", Pattern.CASE_INSENSITIVE);

    private static final Map<String, String> SUPPORTED_BANKS;
    static {
        Map<String, String> map = new HashMap<>();
        map.put("com.nu.production", "Nubank");
        map.put("br.com.intermedium", "Banco Inter");
        map.put("com.itau", "Itaú");
        map.put("com.itau.pers", "Itaú Personnalité");
        map.put("com.itau.empresas", "Itaú Empresas");
        map.put("com.bradesco", "Bradesco");
        map.put("com.bradesco.prime", "Bradesco Prime");
        map.put("com.santander.app", "Santander");
        map.put("br.com.bb.android", "Banco do Brasil");
        map.put("br.com.gabba.Caixa", "Caixa");
        map.put("br.com.caixa.tem", "Caixa Tem");
        map.put("com.c6bank.app", "C6 Bank");
        map.put("com.picpay", "PicPay");
        map.put("com.mercadopago.wallet", "Mercado Pago");
        map.put("br.com.uol.ps.myaccount", "PagBank");
        map.put("com.btgpactual.pactualdigital.mobile", "BTG Pactual");
        map.put("com.btgpactual.banking", "BTG Banking");
        map.put("br.com.neon", "Neon");
        map.put("br.com.willbank", "Will Bank");
        map.put("br.com.bradesco.next", "Next");
        map.put("br.com.sicredi.app", "Sicredi");
        map.put("br.com.sicoob.app", "Sicoob");
        map.put("br.com.cora.app", "Cora");
        map.put("br.com.xp.carteira", "XP");
        map.put("br.com.stone.ton", "Ton");
        map.put("br.com.stone.conta", "Stone");
        SUPPORTED_BANKS = Collections.unmodifiableMap(map);
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;

        String packageName = sbn.getPackageName();
        if (packageName == null || !SUPPORTED_BANKS.containsKey(packageName)) {
            return;
        }

        Notification notification = sbn.getNotification();
        if ((notification.flags & Notification.FLAG_ONGOING_EVENT) != 0 ||
            (notification.flags & Notification.FLAG_GROUP_SUMMARY) != 0) {
            return;
        }

        Bundle extras = notification.extras;
        if (extras == null) return;

        CharSequence titleCs = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigTextCs = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);

        String title = titleCs != null ? titleCs.toString().trim() : "";
        String text = textCs != null ? textCs.toString().trim() : "";
        String bigText = bigTextCs != null ? bigTextCs.toString().trim() : "";
        String body = !bigText.isEmpty() ? bigText : text;

        String combined = (title + " " + body).trim();
        if (combined.isEmpty()) return;

        // Exigir valor monetário ou sinal claro de transação antes de enfileirar
        if (!MONEY_PATTERN.matcher(combined).find()) {
            return;
        }

        long postTime = sbn.getPostTime() > 0 ? sbn.getPostTime() : System.currentTimeMillis();
        String signatureKey = (packageName + "|" + title + "|" + body).toLowerCase(Locale.ROOT);

        if (isDuplicateRecent(signatureKey, postTime)) {
            return;
        }

        try {
            JSONObject item = new JSONObject();
            item.put("id", "bn-" + UUID.randomUUID().toString());
            item.put("packageName", packageName);
            item.put("bankName", SUPPORTED_BANKS.get(packageName));
            item.put("title", title);
            item.put("text", body);
            item.put("timestamp", postTime);

            enqueueItem(item);
            BankNotificationPlugin.emitNotificationToJs(item);
        } catch (Exception ignored) {
            // Ignora falhas de serialização silenciosamente
        }
    }

    private synchronized boolean isDuplicateRecent(String signatureKey, long nowMs) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_RECENT, "[]");
        JSONArray updated = new JSONArray();
        boolean found = false;

        try {
            JSONArray existing = new JSONArray(raw);
            for (int i = 0; i < existing.length(); i++) {
                JSONObject entry = existing.optJSONObject(i);
                if (entry == null) continue;
                long ts = entry.optLong("ts", 0L);
                if (nowMs - ts <= DEDUPE_WINDOW_MS) {
                    updated.put(entry);
                    if (signatureKey.equals(entry.optString("key"))) {
                        found = true;
                    }
                }
            }
            if (!found) {
                JSONObject nextEntry = new JSONObject();
                nextEntry.put("key", signatureKey);
                nextEntry.put("ts", nowMs);
                updated.put(nextEntry);
                prefs.edit().putString(KEY_RECENT, updated.toString()).apply();
            }
        } catch (Exception ignored) {
            return false;
        }

        return found;
    }

    private synchronized void enqueueItem(JSONObject item) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_QUEUE, "[]");
        try {
            JSONArray queue = new JSONArray(raw);
            queue.put(item);

            // Mantém no máximo os últimos MAX_QUEUE_SIZE registros
            if (queue.length() > MAX_QUEUE_SIZE) {
                JSONArray trimmed = new JSONArray();
                int start = queue.length() - MAX_QUEUE_SIZE;
                for (int i = start; i < queue.length(); i++) {
                    trimmed.put(queue.get(i));
                }
                queue = trimmed;
            }
            prefs.edit().putString(KEY_QUEUE, queue.toString()).apply();
        } catch (Exception ignored) {
            JSONArray fallback = new JSONArray();
            fallback.put(item);
            prefs.edit().putString(KEY_QUEUE, fallback.toString()).apply();
        }
    }
}
