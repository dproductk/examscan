import axiosInstance from './axiosInstance'

export const getReportsSummary = (params) =>
  axiosInstance.get('/api/reports/', { params })

export const exportExcel = (params) =>
  axiosInstance.get('/api/reports/export/excel/', {
    params,
    responseType: 'blob',
  })

export const exportPdf = (params) =>
  axiosInstance.get('/api/reports/export/pdf/', {
    params,
    responseType: 'blob',
  })
