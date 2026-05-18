import axiosInstance from './axiosInstance'

// Bundle assignment (moderation)
export const assignBundleModeration = (bundleId, data) =>
  axiosInstance.post(`/api/bundles/${bundleId}/assign-moderation/`, data)

// Teacher bundle views
export const getAssessmentBundles = () =>
  axiosInstance.get('/api/teacher/bundles/assessment/')

export const getModerationBundles = () =>
  axiosInstance.get('/api/teacher/bundles/moderation/')

// Moderation comparison
export const requestComparison = (bundleId) =>
  axiosInstance.post(`/api/moderation/${bundleId}/request-comparison/`)

export const getModerationStatus = (bundleId) =>
  axiosInstance.get(`/api/moderation/${bundleId}/status/`)

// Notifications
export const getNotifications = () =>
  axiosInstance.get('/api/notifications/')

export const markNotificationRead = (id) =>
  axiosInstance.patch(`/api/notifications/${id}/read/`)

export const markAllNotificationsRead = () =>
  axiosInstance.patch('/api/notifications/read-all/')

// Critical Assessment (high-score auto-moderation)
export const triggerCriticalAssessment = (bundleId) =>
  axiosInstance.post(`/api/bundles/${bundleId}/trigger-critical-assessment/`)

export const getCriticalAssessmentStatus = (bundleId) =>
  axiosInstance.get(`/api/bundles/${bundleId}/critical-assessment-status/`)

export const requestCriticalComparison = (bundleId) =>
  axiosInstance.post(`/api/moderation/${bundleId}/request-critical-comparison/`)
