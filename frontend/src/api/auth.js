import axiosInstance from './axiosInstance'

export const login = (credentials) =>
  axiosInstance.post('/api/auth/login/', credentials)

export const refreshToken = (refresh) =>
  axiosInstance.post('/api/auth/refresh/', { refresh })

export const changePassword = (data) =>
  axiosInstance.post('/api/auth/change-password/', data)
