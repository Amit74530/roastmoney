import { Capacitor, registerPlugin } from '@capacitor/core'

const webShareReceiver = {
  getPendingShare: async () => ({ received: false }),
  clearPendingShare: async () => undefined,
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
