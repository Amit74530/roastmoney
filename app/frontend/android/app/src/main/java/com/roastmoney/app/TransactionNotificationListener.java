package com.roastmoney.app;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import com.getcapacitor.JSObject;

public class TransactionNotificationListener extends NotificationListenerService {

    private static final String TAG = "RoastNotification";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;

        try {
            String packageName = sbn.getPackageName();
            Notification notification = sbn.getNotification();
            Bundle extras = notification.extras;
            if (extras == null) return;

            CharSequence titleSeq = extras.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence textSeq = extras.getCharSequence(Notification.EXTRA_TEXT);
            CharSequence bigTextSeq = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);

            String title = titleSeq != null ? titleSeq.toString() : "";
            String text = bigTextSeq != null ? bigTextSeq.toString() : (textSeq != null ? textSeq.toString() : "");

            if (text.isEmpty() && title.isEmpty()) return;

            JSObject payload = new JSObject();
            payload.put("packageName", packageName);
            payload.put("title", title);
            payload.put("text", text);
            payload.put("postTime", sbn.getPostTime());

            TransactionCapturePlugin plugin = TransactionCapturePlugin.getInstance();
            if (plugin != null) {
                plugin.handleNotification(payload);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error handling notification in listener", e);
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // No action needed for removed notifications
    }
}
