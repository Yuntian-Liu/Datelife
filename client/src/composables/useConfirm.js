import { ref, createApp } from 'vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

export function useConfirm() {
  return function showConfirm(options) {
    return new Promise((resolve) => {
      const message = typeof options === 'string' ? options : options.message
      const title = options.title || '确认'
      const confirmText = options.confirmText || '确定'
      const cancelText = options.cancelText || '取消'
      const type = options.type || 'default'

      const container = document.createElement('div')
      document.body.appendChild(container)

      const app = createApp(ConfirmDialog, {
        title,
        message,
        confirmText,
        cancelText,
        type,
        onConfirm: () => {
          cleanup()
          resolve(true)
        },
        onCancel: () => {
          cleanup()
          resolve(false)
        }
      })

      function cleanup() {
        app.unmount()
        container.remove()
      }

      app.mount(container)
    })
  }
}
