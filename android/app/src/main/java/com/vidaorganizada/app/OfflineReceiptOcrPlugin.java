package com.vidaorganizada.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

@CapacitorPlugin(name = "OfflineReceiptOcr")
public class OfflineReceiptOcrPlugin extends Plugin {
    private static final int MAX_DIMENSION = 2048;

    @PluginMethod
    public void recognizeText(PluginCall call) {
        String rawBase64 = call.getString("imageBase64", "");
        if (rawBase64 == null || rawBase64.trim().isEmpty()) {
            call.reject("Nenhuma imagem recebida para OCR offline.");
            return;
        }

        try {
            int commaIdx = rawBase64.indexOf(',');
            String cleanBase64 = commaIdx != -1 ? rawBase64.substring(commaIdx + 1) : rawBase64;
            byte[] decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT);

            BitmapFactory.Options boundsOpts = new BitmapFactory.Options();
            boundsOpts.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length, boundsOpts);

            int sampleSize = 1;
            int width = boundsOpts.outWidth;
            int height = boundsOpts.outHeight;
            while ((width / sampleSize) > MAX_DIMENSION || (height / sampleSize) > MAX_DIMENSION) {
                sampleSize *= 2;
            }

            BitmapFactory.Options decodeOpts = new BitmapFactory.Options();
            decodeOpts.inSampleSize = sampleSize;
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length, decodeOpts);

            if (bitmap == null) {
                call.reject("Não foi possível decodificar a imagem da nota fiscal.");
                return;
            }

            InputImage image = InputImage.fromBitmap(bitmap, 0);
            TextRecognizer recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);

            recognizer.process(image)
                    .addOnSuccessListener(visionText -> {
                        JSObject result = new JSObject();
                        result.put("text", visionText != null ? visionText.getText() : "");
                        result.put("blockCount", visionText != null ? visionText.getTextBlocks().size() : 0);
                        bitmap.recycle();
                        call.resolve(result);
                    })
                    .addOnFailureListener(e -> {
                        bitmap.recycle();
                        call.reject("Falha no reconhecimento de texto offline: " + e.getMessage(), e);
                    });
        } catch (Exception e) {
            call.reject("Erro ao preparar imagem para OCR offline: " + e.getMessage(), e);
        }
    }
}
