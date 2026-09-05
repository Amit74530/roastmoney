import { Capacitor, registerPlugin } from '@capacitor/core'

const webShareReceiver = {
  getPendingShare: async () => ({ received: false }),
  clearPendingShare: async () => undefined,
  readPendingShareForUpload: async () => {
    throw new Error('Share-to-RoastScan is available in the Android app.')
  },
}

export const ShareReceiver = registerPlugin('ShareReceiver', {
  web: webShareReceiver,
})

export function toDisplayableShare(payload) {
  if (!payload?.path) return payload
  return {
    ...payload,
    webPath: Capacitor.convertFileSrc(payload.path),
  }
}

export function isNativeShareReceiverAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('ShareReceiver')
}
