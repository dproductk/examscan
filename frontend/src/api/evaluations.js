import axiosInstance from './axiosInstance'

export const submitEvaluation = (data) =>
  axiosInstance.post('/api/evaluations/', data)

export const getEvaluation = (answerSheetId) =>
  axiosInstance.get(`/api/evaluations/${answerSheetId}/`)

export const amendMarks = (evaluationId, data) =>
  axiosInstance.patch(`/api/evaluations/${evaluationId}/amend-marks/`, data)
