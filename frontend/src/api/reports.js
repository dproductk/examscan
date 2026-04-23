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

export const downloadMarkedPDFs = async (params) => {
  // params: { subject_id: X } or { bundle_id: Y }
  const response = await axiosInstance.get(
    '/api/reports/download-marked-pdfs/',
    {
      params,
      responseType: 'blob',   // must be blob for binary ZIP
      timeout: 120000,        // 2 min timeout — large bundles take time
    }
  )

  const url  = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href  = url

  const disposition = response.headers['content-disposition'] || ''
  const filename    = disposition.includes('filename=')
    ? disposition.split('filename=')[1].replace(/"/g, '').trim()
    : 'marked_papers.zip'

  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
