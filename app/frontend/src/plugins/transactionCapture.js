import { Capacitor, registerPlugin } from '@capacitor/core'

const webFallback = {
  isEnabled: async () => ({ enabled: false }),
  openSettings: async () => {
    throw new Error('Notification capture is only available on Android.')
  },
}

export const TransactionCapture = registerPlugin('TransactionCapture', {
  web: webFallback,
})

export function isNativeCaptureAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}
