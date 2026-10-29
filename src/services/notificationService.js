/**
 * Notification Service for CallPlan — Bank BRI KCP Iskandar Palembang
 * 
 * Scope: Web Notifications API (requires app to be open in browser tab).
 * Does NOT support background push (Service Worker Push API not used) to keep
 * the implementation simple, safe, and dependency-free.
 * 
 * Honest behaviour:
 *  - Notifications work when the browser tab is open (even if minimised).
 *  - Notifications do NOT work when the browser is closed.
 *  - A visible in-app badge/banner is always shown as fallback.
 */

const SENT_NOTIFICATIONS_KEY = 'cp-sent-notifications-v1'
const SETTINGS_KEY = 'cp-notification-settings-v1'

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayString() {
  // YYYY-MM-DD in local timezone (Asia/Jakarta)
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function nowMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function parseTimeToMinutes(timeStr) {
  // "HH:MM" or "HH:MM:SS"
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function formatTimeId(id, type) {
  return `${type}:${id}:${todayString()}`
}

// ─── Sent Deduplication Store ────────────────────────────────────────────────

function getSentSet() {
  try {
    const raw = localStorage.getItem(SENT_NOTIFICATIONS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    // Prune entries older than 2 days to prevent unbounded growth
    const today = todayString()
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000)
      .toISOString().slice(0, 10)
    const pruned = parsed.filter((key) => {
      const parts = key.split(':')
      const datePart = parts[parts.length - 1]
      return datePart >= twoDaysAgo
    })
    if (pruned.length !== parsed.length) saveSentSet(new Set(pruned))
    return new Set(pruned)
  } catch {
    return new Set()
  }
}

function saveSentSet(set) {
  try {
    localStorage.setItem(SENT_NOTIFICATIONS_KEY, JSON.stringify([...set]))
  } catch { /* ignore quota errors */ }
}

function markSent(key) {
  const set = getSentSet()
  set.add(key)
  saveSentSet(set)
}

function wasSent(key) {
  return getSentSet().has(key)
}

// ─── Settings ────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS = {
  enabled: true,                // Whether to attempt browser notifications
  reminderMinutesBefore: 15,    // How many minutes before visit to remind
  remindTodayVisits: true,      // Remind for visits scheduled today
  remindFollowUps: true,        // Remind for follow-ups due today / overdue
  remindScheduleChanges: true,  // Remind when schedule/follow-up updates occur
  discreetMode: true,           // Protect sensitive customer details in system popups
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(partial) {
  const current = loadSettings()
  const updated = { ...current, ...partial }
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
  } catch { /* ignore */ }
  return updated
}

// ─── Permission Handling ──────────────────────────────────────────────────────

export function getPermissionStatus() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission // 'default', 'granted', 'denied'
}

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result
}

// ─── Core Notification Sender ─────────────────────────────────────────────────

function sendBrowserNotification(dedupKey, title, body, { tag, onClick } = {}) {
  if (!('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false
  if (wasSent(dedupKey)) return false

  try {
    const n = new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: tag || dedupKey,
      silent: false,
      requireInteraction: false,
    })

    if (onClick) {
      n.onclick = (e) => {
        e.preventDefault()
        window.focus()
        onClick()
      }
    }

    markSent(dedupKey)
    return true
  } catch (err) {
    console.warn('[NotificationService] Failed to send notification:', err)
    return false
  }
}

// ─── Public Test Notification ─────────────────────────────────────────────────

export function sendTestNotification() {
  if (Notification.permission !== 'granted') return false
  const key = `test:${Date.now()}`
  return sendBrowserNotification(
    key,
    'CallPlan — Notifikasi Aktif ✓',
    'Pengingat jadwal dan follow-up akan muncul di sini.',
    { tag: 'callplan-test' }
  )
}

/**
 * Triggered when a schedule or follow-up change occurs (e.g. reschedule or edit)
 */
export function notifyScheduleChange(title, body, onClick) {
  const settings = loadSettings()
  if (!settings.enabled || !settings.remindScheduleChanges) return false
  if (Notification.permission !== 'granted') return false

  return sendBrowserNotification(
    `update:${Date.now()}`,
    title || 'Pembaruan Jadwal — CallPlan',
    body || 'Jadwal atau status kunjungan telah diperbarui.',
    { tag: `cp-update-${Date.now()}`, onClick }
  )
}

// ─── Visit Reminders ─────────────────────────────────────────────────────────

/**
 * Check and fire visit reminders.
 * @param {Array} appointments - Filtered for current RM (already isolated)
 * @param {Function} onNavigate - Navigate callback (optional)
 */
export function checkVisitReminders(appointments = [], settings, onNavigate) {
  if (!settings.remindTodayVisits) return []
  const today = todayString()
  const now = nowMinutes()
  const remindBefore = settings.reminderMinutesBefore ?? 15

  const triggered = []

  for (const apt of appointments) {
    // Only process today's scheduled visits
    if (apt.date !== today) continue
    if (apt.status !== 'Terjadwal') continue

    const visitMinutes = parseTimeToMinutes(apt.time)

    // === Reminder N minutes BEFORE the visit ===
    if (visitMinutes !== null) {
      const minutesLeft = visitMinutes - now
      const dedupKey = formatTimeId(apt.id, `visit-pre-${remindBefore}`)

      if (minutesLeft >= 0 && minutesLeft <= remindBefore && !wasSent(dedupKey)) {
        const label = minutesLeft === 0 ? 'Sekarang' : `${minutesLeft} menit lagi`
        const sent = sendBrowserNotification(
          dedupKey,
          'Pengingat Kunjungan — CallPlan',
          `Ada agenda kunjungan nasabah ${label} (pukul ${apt.time}).`,
          {
            tag: dedupKey,
            onClick: () => onNavigate?.('schedule'),
          }
        )
        if (sent) triggered.push({ type: 'visit-pre', apt, minutesLeft })
      }
    }

    // === Morning reminder: "You have visits today" (fire at or after 07:00) ===
    const morningDedupKey = formatTimeId(apt.id, 'visit-morning')
    if (now >= 7 * 60 && !wasSent(morningDedupKey)) {
      const sent = sendBrowserNotification(
        morningDedupKey,
        'Ada Jadwal Kunjungan Hari Ini',
        `Pukul ${apt.time} — Agenda kunjungan nasabah sudah menunggu.`,
        {
          tag: morningDedupKey,
          onClick: () => onNavigate?.('schedule'),
        }
      )
      if (sent) triggered.push({ type: 'visit-morning', apt })
    }
  }

  return triggered
}

// ─── Follow-up Reminders ──────────────────────────────────────────────────────

/**
 * Check and fire follow-up reminders.
 * @param {Array} followUps - Filtered for current RM
 * @param {Function} onNavigate
 */
export function checkFollowUpReminders(followUps = [], settings, onNavigate) {
  if (!settings.remindFollowUps) return []
  const today = todayString()
  const triggered = []

  for (const fu of followUps) {
    // Skip completed or cancelled items — NEVER remind about done work
    if (fu.status === 'Selesai' || fu.status === 'Dibatalkan') continue

    const isOverdue = fu.date < today
    const isDueToday = fu.date === today

    if (isOverdue) {
      const dedupKey = formatTimeId(fu.id, 'followup-overdue')
      if (!wasSent(dedupKey)) {
        const sent = sendBrowserNotification(
          dedupKey,
          'Follow-up Terlambat — CallPlan',
          `Ada tindak lanjut yang sudah melewati jatuh tempo dan belum diselesaikan.`,
          {
            tag: dedupKey,
            onClick: () => onNavigate?.('follow-up'),
          }
        )
        if (sent) triggered.push({ type: 'followup-overdue', fu })
      }
    } else if (isDueToday) {
      const dedupKey = formatTimeId(fu.id, 'followup-today')
      if (!wasSent(dedupKey)) {
        const sent = sendBrowserNotification(
          dedupKey,
          'Pengingat Follow-up Hari Ini',
          `Ada tindak lanjut nasabah yang dijadwalkan untuk hari ini di CallPlan.`,
          {
            tag: dedupKey,
            onClick: () => onNavigate?.('follow-up'),
          }
        )
        if (sent) triggered.push({ type: 'followup-today', fu })
      }
    }
  }

  return triggered
}

// ─── In-App Reminder Summary (fallback / always shown) ───────────────────────

/**
 * Returns a summary of pending items for the in-app reminder banner.
 * This always works regardless of browser notification permission.
 * @param {Array} appointments - RM's own appointments
 * @param {Array} followUps - RM's own follow-ups
 * @returns {{ todayVisits, overdueFollowUps, todayFollowUps }}
 */
export function getInAppReminderSummary(appointments = [], followUps = []) {
  const today = todayString()

  const todayVisits = appointments.filter(
    (a) => a.date === today && a.status === 'Terjadwal'
  )

  const overdueFollowUps = followUps.filter(
    (f) => f.status === 'Belum Dilakukan' && f.date < today
  )

  const todayFollowUps = followUps.filter(
    (f) => f.status === 'Belum Dilakukan' && f.date === today
  )

  return { todayVisits, overdueFollowUps, todayFollowUps }
}
