const MAX_ENTRIES = 500
const logs = []

function now() {
  return new Date().toISOString()
}

function push(level, category, message, data) {
  const entry = { time: now(), level, category, message }
  if (data !== undefined) entry.data = data
  logs.push(entry)
  if (logs.length > MAX_ENTRIES) logs.shift()
  // 同步输出到控制台，方便开发调试
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  fn(`[${category}] ${message}`, data || '')
}

export const logger = {
  info(category, message, data) { push('info', category, message, data) },
  warn(category, message, data) { push('warn', category, message, data) },
  error(category, message, data) { push('error', category, message, data) },

  getLogs() { return [...logs] },

  clearLogs() { logs.length = 0 },

  // 收集系统诊断信息
  getSystemInfo() {
    const nav = navigator
    return {
      app: 'Datelife',
      version: __APP_VERSION__,
      time: now(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: nav.language,
      userAgent: nav.userAgent,
      platform: nav.platform,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      online: nav.onLine,
      tokenExists: !!localStorage.getItem('token'),
      userInStorage: !!localStorage.getItem('user'),
      userBadge: (() => { try { return JSON.parse(localStorage.getItem('user'))?.badge || null } catch { return null } })(),
      serviceWorker: 'serviceWorker' in navigator ? navigator.serviceWorker.controller?.state || 'uncontrolled' : 'unsupported',
      cameraSupported: !!navigator.mediaDevices?.getUserMedia,
      standalone: window.matchMedia('(display-mode: standalone)').matches,
      userAgentShort: nav.userAgent.slice(0, 80),
      devicePixelRatio: window.devicePixelRatio || 1,
      maxTouchPoints: nav.maxTouchPoints ?? 0,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
  }
}

export default logger
