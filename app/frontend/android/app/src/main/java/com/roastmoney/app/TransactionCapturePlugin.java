package com.roastmoney.app;

import android.content.Intent;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TransactionCapture")
public class TransactionCapturePlugin extends Plugin {

    private static final String TAG = "RoastMoneyCapture";
    private static TransactionCapturePlugin instance;

    @Override
    public void load() {
        instance = this;
        Log.d(TAG, "TransactionCapturePlugin loaded");
    }

    public static TransactionCapturePlugin getInstance() {
        return instance;
    }

    /**
     * Called from the NotificationListenerService to forward data to JS.
     */
    public void handleNotification(JSObject payload) {
        notifyListeners("notificationCaptured", payload, true);
    }

    /**
     * Checks if the user has granted notification access permission.
     */
    @PluginMethod
    public void isEnabled(PluginCall call) {
        JSObject result = new JSObject();
        try {
            String enabledListeners = Settings.Secure.getString(
                getContext().getContentResolver(),
                "enabled_notification_listeners"
            );
            boolean enabled = enabledListeners != null
                && enabledListeners.contains(getContext().getPackageName());
            result.put("enabled", enabled);
        } catch (Exception e) {
            Log.e(TAG, "Failed to check notification access", e);
            result.put("enabled", false);
        }
        call.resolve(result);
    }

    /**
     * Opens the Android notification access settings page.
     */
    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to open notification settings", e);
            call.reject("Could not open notification settings", e);
        }
    }
}