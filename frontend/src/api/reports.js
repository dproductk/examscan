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

export const exportStudentPdf = (rollNumber, params) =>
  axiosInstance.get(`/api/reports/export/student-pdf/${rollNumber}/`, {
    params,
    responseType: 'blob',
  })

export const exportAllPdfs = (params) =>
  axiosInstance.get('/api/reports/export/all-pdfs/', {
    params,
    responseType: 'blob',
  })

export const exportBundlePdf = (bundleId) =>
  axiosInstance.get(`/api/reports/export/bundle-pdf/${bundleId}/`, {
    responseType: 'blob',
  })

// Reuse bundles list API — returns submitted bundles for the report page
export const getBundlesForReport = () =>
  axiosInstance.get('/api/bundles/list/')
