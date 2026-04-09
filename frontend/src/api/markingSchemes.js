import axiosInstance from './axiosInstance'

export const getMarkingSchemes = (params) =>
  axiosInstance.get('/api/marking-schemes/', { params })

export const getMarkingScheme = (id) =>
  axiosInstance.get(`/api/marking-schemes/${id}/`)

export const createMarkingScheme = (data) =>
  axiosInstance.post('/api/marking-schemes/', data)

export const updateMarkingScheme = (id, data) =>
  axiosInstance.put(`/api/marking-schemes/${id}/`, data)
