import axiosInstance from './axiosInstance'

export const createAmendment = (data) =>
  axiosInstance.post('/api/amendments/', data)

export const getAmendments = (params) =>
  axiosInstance.get('/api/amendments/list/', { params })

export const resolveAmendment = (id, data) =>
  axiosInstance.patch(`/api/amendments/${id}/resolve/`, data)

export const rescanAmendment = (id, formData) =>
  axiosInstance.post(`/api/amendments/${id}/rescan/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
