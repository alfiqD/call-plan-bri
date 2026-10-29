import { useEffect, useRef, useState, useCallback } from 'react'
import {
  checkFollowUpReminders,
  checkVisitReminders,
  getInAppReminderSummary,
  getPermissionStatus,
  loadSettings,
  requestPermission,
  saveSettings,
  sendTestNotification,
  DEFAULT_SETTINGS,
} from '../services/notificationService'

const CHECK_INTERVAL_MS = 60 * 1000 // Check every 60 seconds

/**
 * Custom hook for managing notifications in CallPlan.
 * @param {Object} params
 * @param {Array}  params.appointments - RM's own appointments (already filtered)
 * @param {Array}  params.followUps    - RM's own follow-ups (already filtered)
 * @param {string} params.role         - 'rm' | 'admin'
 * @param {Function} params.onNavigate - Navigation callback
 */
export function useNotifications({ appointments = [], followUps = [], role, onNavigate }) {
  const [permission, setPermission] = useState(() => getPermissionStatus())
  const [settings, setSettings] = useState(() => loadSettings())
  const [inAppSummary, setInAppSummary] = useState({ todayVisits: [], overdueFollowUps: [], todayFollowUps: [] })
  const intervalRef = useRef(null)
  const isRM = role === 'rm' || !role

  // Compute in-app summary whenever data changes
  useEffect(() => {
    if (!isRM) {
      setInAppSummary({ todayVisits: [], overdueFollowUps: [], todayFollowUps: [] })
      return
    }
    setInAppSummary(getInAppReminderSummary(appointments, followUps))
  }, [appointments, followUps, isRM])

  // Run notification checks on an interval
  const runChecks = useCallback(() => {
    if (!isRM) return
    if (permission === 'granted' && settings.enabled) {
      checkVisitReminders(appointments, settings, onNavigate)
      checkFollowUpReminders(followUps, settings, onNavigate)
    }
    // Always update in-app summary
    setInAppSummary(getInAppReminderSummary(appointments, followUps))
  }, [appointments, followUps, permission, settings, onNavigate, isRM])

  // Run immediately when data loads, then on interval
  useEffect(() => {
    runChecks()
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(runChecks, CHECK_INTERVAL_MS)
    return () => clearInterval(intervalRef.current)
  }, [runChecks])

  // Sync permission state when page becomes visible (user may have changed it in browser settings)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setPermission(getPermissionStatus())
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const handleRequestPermission = useCallback(async () => {
    const result = await requestPermission()
    setPermission(result)
    return result
  }, [])

  const handleSaveSettings = useCallback((partial) => {
    const updated = saveSettings(partial)
    setSettings(updated)
  }, [])

  const handleTestNotification = useCallback(() => {
    return sendTestNotification()
  }, [])

  return {
    permission,
    settings,
    inAppSummary,
    requestPermission: handleRequestPermission,
    saveSettings: handleSaveSettings,
    sendTestNotification: handleTestNotification,
  }
}
