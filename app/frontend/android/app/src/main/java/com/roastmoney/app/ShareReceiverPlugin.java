package com.roastmoney.app;

import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.OpenableColumns;
import android.webkit.MimeTypeMap;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Locale;
import java.util.UUID;

/**
 * Receives Android ACTION_SEND image shares and exposes them to the Capacitor WebView.
 * Incoming content URIs are copied into app cache so the grant does not need to persist
 * and no broad storage permission is required.
 */
@CapacitorPlugin(name = "ShareReceiver")
public class ShareReceiverPlugin extends Plugin {

    private static final String EVENT_SHARE_RECEIVED = "shareReceived";
    private static final long MAX_BYTES = 25L * 1024L * 1024L;

    private JSObject pendingShare;

    @Override
    protected void handleOnNewIntent(Intent intent) {
        handleShareIntent(intent);
    }

    @PluginMethod
    public void getPendingShare(PluginCall call) {
        if (pendingShare == null) {
            JSObject empty = new JSObject();
            empty.put("received", false);
            call.resolve(empty);
            return;
        }
        call.resolve(pendingShare);
    }

    @PluginMethod
    public void clearPendingShare(PluginCall call) {
        pendingShare = null;
        call.resolve();
    }

    private void handleShareIntent(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) {
            return;
        }

        execute(() -> {
            JSObject payload = copySharedImage(intent);
            pendingShare = payload;
            notifyListeners(EVENT_SHARE_RECEIVED, payload, true);
        });
    }

    private JSObject copySharedImage(Intent intent) {
        String id = UUID.randomUUID().toString();
        String declaredType = intent.getType();
        Uri uri = readStreamUri(intent);

        if (uri == null) {
            return errorPayload(id, "missing_stream", "No shared image was attached.");
        }

        ContentResolver resolver = getContext().getContentResolver();
        String mimeType = resolver.getType(uri);
        if (mimeType == null || mimeType.isEmpty()) {
            mimeType = declaredType;
        }
        if (mimeType == null || !mimeType.toLowerCase(Locale.US).startsWith("image/")) {
            return errorPayload(id, "unsupported_type", "ROAST.MONEY can only receive shared images.");
        }

        try {
            tryTakeReadPermission(uri);
            String displayName = queryDisplayName(resolver, uri);
            File destDir = new File(getContext().getCacheDir(), "roastscan");
            if (!destDir.exists() && !destDir.mkdirs()) {
                return errorPayload(id, "unreadable", "Could not prepare a local copy of the shared image.");
            }

            String extension = extensionFor(mimeType, displayName, uri);
            File dest = new File(destDir, id + extension);

            try (InputStream in = resolver.openInputStream(uri); OutputStream out = new FileOutputStream(dest)) {
                if (in == null) {
                    return errorPayload(id, "unreadable", "The shared image could not be opened.");
                }
                byte[] buffer = new byte[8192];
                long total = 0;
                int read;
                while ((read = in.read(buffer)) != -1) {
                    total += read;
                    if (total > MAX_BYTES) {
                        dest.delete();
                        return errorPayload(id, "too_large", "The shared image is too large to open.");
                    }
                    out.write(buffer, 0, read);
                }
                if (total == 0) {
                    dest.delete();
                    return errorPayload(id, "unreadable", "The shared image was empty.");
                }
            }

            JSObject payload = new JSObject();
            payload.put("id", id);
            payload.put("received", true);
            payload.put("mimeType", mimeType);
            payload.put("fileName", displayName != null ? displayName : dest.getName());
            payload.put("path", dest.getAbsolutePath());
            return payload;
        } catch (SecurityException securityException) {
            return errorPayload(id, "unreadable", "Permission to read the shared image was denied.");
        } catch (Exception exception) {
            return errorPayload(id, "unreadable", "The shared image could not be opened.");
        }
    }

    private Uri readStreamUri(Intent intent) {
        Uri uri;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            uri = intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class);
        } else {
            uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        }
        if (uri == null && intent.getClipData() != null && intent.getClipData().getItemCount() > 0) {
            uri = intent.getClipData().getItemAt(0).getUri();
        }
        return uri;
    }

    private void tryTakeReadPermission(Uri uri) {
        try {
            getContext()
                .getContentResolver()
                .takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (SecurityException | IllegalArgumentException ignored) {
            // Share grants are often one-shot; the cache copy is the durable copy.
        }
    }

    private String queryDisplayName(ContentResolver resolver, Uri uri) {
        try (Cursor cursor = resolver.query(uri, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) {
                    return cursor.getString(index);
                }
            }
        } catch (Exception ignored) {
            // Fall back to the URI segment below.
        }
        return uri.getLastPathSegment();
    }

    private String extensionFor(String mimeType, String displayName, Uri uri) {
        String ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType);
        if (ext != null && !ext.isEmpty()) {
            return "." + ext;
        }
        String source = displayName != null ? displayName : uri.getLastPathSegment();
        if (source != null) {
            int dot = source.lastIndexOf('.');
            if (dot >= 0 && dot < source.length() - 1) {
                String maybe = source.substring(dot);
                if (maybe.length() <= 5) {
                    return maybe;
                }
            }
        }
        return ".img";
    }

    private JSObject errorPayload(String id, String code, String message) {
        JSObject payload = new JSObject();
        payload.put("id", id);
        payload.put("received", false);
        payload.put("error", code);
        payload.put("message", message);
        return payload;
    }
}
