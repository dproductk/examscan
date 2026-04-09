import axiosInstance from './axiosInstance'

export const createBundle = (data) =>
  axiosInstance.post('/api/bundles/', data)

export const getBundles = (params) =>
  axiosInstance.get('/api/bundles/list/', { params })

export const getBundle = (id) =>
  axiosInstance.get(`/api/bundles/${id}/`)

export const submitBundle = (id) =>
  axiosInstance.patch(`/api/bundles/${id}/submit/`)

export const getSubjects = (params) =>
  axiosInstance.get('/api/bundles/subjects/', { params })

export const createSubject = (data) =>
  axiosInstance.post('/api/bundles/subjects/', data)
