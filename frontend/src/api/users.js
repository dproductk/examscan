import axiosInstance from './axiosInstance'

export const getUsers = (params) =>
  axiosInstance.get('/api/users/', { params })

export const createUser = (data) =>
  axiosInstance.post('/api/users/', data)

export const updateUser = (id, data) =>
  axiosInstance.patch(`/api/users/${id}/`, data)

export const deleteUser = (id) =>
  axiosInstance.delete(`/api/users/${id}/`)
