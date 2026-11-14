package com.vidaorganizada.app;

import android.app.KeyguardManager;
import android.content.Context;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.Executor;

@CapacitorPlugin(name = "BiometricLock")
public class BiometricLockPlugin extends Plugin {

    private boolean canUseCombinedCredential() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.R;
    }

    private int getAllowedAuthenticators() {
        if (canUseCombinedCredential()) {
            return BiometricManager.Authenticators.BIOMETRIC_STRONG
                | BiometricManager.Authenticators.BIOMETRIC_WEAK
                | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
        }
        return BiometricManager.Authenticators.BIOMETRIC_WEAK;
    }

    private boolean isDeviceSecure(Context context) {
        if (context == null) return false;
        try {
            KeyguardManager km = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
            return km != null && km.isDeviceSecure();
        } catch (Exception ignored) {
            return false;
        }
    }

    @PluginMethod
    public void checkAvailability(PluginCall call) {
        Context context = getContext();
        if (context == null) {
            JSObject res = new JSObject();
            res.put("available", false);
            res.put("biometryAvailable", false);
            res.put("credentialAvailable", false);
            res.put("status", "NO_CONTEXT");
            call.resolve(res);
            return;
        }

        BiometricManager manager = BiometricManager.from(context);
        int bioStatus = manager.canAuthenticate(
            canUseCombinedCredential()
                ? (BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.BIOMETRIC_WEAK)
                : BiometricManager.Authenticators.BIOMETRIC_WEAK
        );
        boolean biometryAvailable = (bioStatus == BiometricManager.BIOMETRIC_SUCCESS);
        boolean credentialAvailable = isDeviceSecure(context);
        boolean combinedAvailable;

        if (canUseCombinedCredential()) {
            int combinedStatus = manager.canAuthenticate(getAllowedAuthenticators());
            combinedAvailable = (combinedStatus == BiometricManager.BIOMETRIC_SUCCESS) || credentialAvailable;
        } else {
            combinedAvailable = biometryAvailable || credentialAvailable;
        }

        JSObject res = new JSObject();
        res.put("available", combinedAvailable);
        res.put("biometryAvailable", biometryAvailable);
        res.put("credentialAvailable", credentialAvailable);
        res.put("status", combinedAvailable ? "AVAILABLE" : "NONE_ENROLLED");
        call.resolve(res);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        if (!(getActivity() instanceof AppCompatActivity)) {
            JSObject res = new JSObject();
            res.put("authenticated", false);
            res.put("message", "Atividade Android indisponível.");
            call.resolve(res);
            return;
        }

        AppCompatActivity activity = (AppCompatActivity) getActivity();
        String title = call.getString("title", "Desbloquear Finanças");
        String subtitle = call.getString("subtitle", "Confirme sua identidade para visualizar valores e lançamentos");

        activity.runOnUiThread(() -> {
            try {
                Executor executor = ContextCompat.getMainExecutor(activity);
                BiometricPrompt prompt = new BiometricPrompt(
                    activity,
                    executor,
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                            super.onAuthenticationSucceeded(result);
                            JSObject res = new JSObject();
                            res.put("authenticated", true);
                            call.resolve(res);
                        }

                        @Override
                        public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                            super.onAuthenticationError(errorCode, errString);
                            JSObject res = new JSObject();
                            res.put("authenticated", false);
                            res.put("errorCode", errorCode);
                            res.put("message", errString.toString());
                            call.resolve(res);
                        }

                        @Override
                        public void onAuthenticationFailed() {
                            super.onAuthenticationFailed();
                            // Let BiometricPrompt keep listening until user retries or cancels
                        }
                    }
                );

                BiometricPrompt.PromptInfo.Builder builder = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle(title)
                    .setSubtitle(subtitle);

                if (canUseCombinedCredential()) {
                    builder.setAllowedAuthenticators(getAllowedAuthenticators());
                } else if (isDeviceSecure(activity)) {
                    builder.setDeviceCredentialAllowed(true);
                } else {
                    builder.setNegativeButtonText("Cancelar");
                }

                prompt.authenticate(builder.build());
            } catch (Exception e) {
                JSObject res = new JSObject();
                res.put("authenticated", false);
                res.put("message", e.getMessage() != null ? e.getMessage() : "Falha ao abrir biometria.");
                call.resolve(res);
            }
        });
    }
}
