package com.ladyjaja.demo;

import android.Manifest;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private Uri cameraUri;
    private static final int FILE_CHOOSER = 101;
    private static final int CAMERA_PERMISSION = 102;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(false);

        webView.addJavascriptInterface(new NativeBridge(), "AndroidBridge");
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectNativeHelpers(view);
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                openCamera();
                return true;
            }
        });

        webView.loadUrl("file:///android_asset/index.html");
    }

    private void injectNativeHelpers(WebView view) {
        String js = "(function(){" +
                "if(window.LJ&&window.AndroidBridge){" +
                "LJ.download=function(filename,content,type){AndroidBridge.saveText(String(filename),String(content),type||'text/plain');};" +
                "LJ.downloadDataUrl=function(filename,dataUrl){AndroidBridge.saveDataUrl(String(filename),String(dataUrl));};" +
                "}" +
                "if(window.AndroidBridge){" +
                "window.open=function(){var h='';return{document:{write:function(s){h+=String(s);},close:function(){AndroidBridge.printHtml('Lady Jaja Report',h);}}};};" +
                "}" +
                "})();";
        view.evaluateJavascript(js, null);
    }

    private void openCamera() {
        if (android.os.Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION);
            return;
        }
        ContentValues values = new ContentValues();
        values.put(MediaStore.Images.Media.DISPLAY_NAME, "LadyJaja_" + System.currentTimeMillis() + ".jpg");
        values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
        cameraUri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
        Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        intent.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
        intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivityForResult(intent, FILE_CHOOSER);
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            openCamera();
        } else if (fileCallback != null) {
            fileCallback.onReceiveValue(null);
            fileCallback = null;
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER && fileCallback != null) {
            Uri[] result = (resultCode == RESULT_OK && cameraUri != null) ? new Uri[]{cameraUri} : null;
            fileCallback.onReceiveValue(result);
            fileCallback = null;
            cameraUri = null;
        }
    }

    @Override public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    public class NativeBridge {
        @JavascriptInterface public void saveText(String filename, String content, String mime) {
            saveBytes(filename, content.getBytes(StandardCharsets.UTF_8), mime == null ? "text/plain" : mime);
        }

        @JavascriptInterface public void saveDataUrl(String filename, String dataUrl) {
            try {
                int comma = dataUrl.indexOf(',');
                if (comma < 0) return;
                String header = dataUrl.substring(0, comma);
                String mime = "application/octet-stream";
                int start = header.indexOf(':') + 1, end = header.indexOf(';');
                if (start > 0 && end > start) mime = header.substring(start, end);
                byte[] bytes = Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT);
                saveBytes(filename, bytes, mime);
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Could not save file", Toast.LENGTH_SHORT).show());
            }
        }

        @JavascriptInterface public void printHtml(String jobName, String html) {
            runOnUiThread(() -> {
                final WebView printView = new WebView(MainActivity.this);
                WebSettings settings = printView.getSettings();
                settings.setJavaScriptEnabled(true);
                settings.setAllowFileAccess(true);
                settings.setAllowContentAccess(true);
                printView.setWebViewClient(new WebViewClient() {
                    private boolean printed = false;
                    @Override public void onPageFinished(WebView view, String url) {
                        if (printed) return;
                        printed = true;
                        PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                        String safeJobName = (jobName == null || jobName.trim().isEmpty()) ? "Lady Jaja Report" : jobName;
                        printManager.print(safeJobName, view.createPrintDocumentAdapter(safeJobName), new PrintAttributes.Builder().build());
                    }
                });
                printView.loadDataWithBaseURL("file:///android_asset/", html, "text/html", "UTF-8", null);
            });
        }

        private void saveBytes(String filename, byte[] bytes, String mime) {
            try {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                values.put(MediaStore.Downloads.MIME_TYPE, mime);
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Lady Jaja");
                Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new Exception("No download URI");
                try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                    out.write(bytes);
                }
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Saved to Downloads/Lady Jaja", Toast.LENGTH_SHORT).show());
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Could not save file", Toast.LENGTH_SHORT).show());
            }
        }
    }
}
