import axiosInstance from './axiosInstance'

export const getBundleQualityCheck = (bundleId) =>
  axiosInstance.get(`/api/bundles/${bundleId}/quality-check/`)

export const replaceSheetImages = (sheetId, formData) =>
  axiosInstance.post(`/api/answer-sheets/${sheetId}/replace-image/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
