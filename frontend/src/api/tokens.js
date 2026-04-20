import axiosInstance from './axiosInstance'

export const generateTokens = (data) =>
  axiosInstance.post('/api/bundles/tokens/generate/', data)

export const listTokens = (params) =>
  axiosInstance.get('/api/bundles/tokens/', { params })

export const uploadTokenFile = (formData) =>
  axiosInstance.post('/api/bundles/tokens/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
