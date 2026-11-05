import { http } from '@/http/http'
import type { PageResult } from '@/http/types'

export type SampleLoanSite = string
export type SampleLoanLocation = string
export type SampleLoanMaterialType = 'SAMPLE' | 'REAGENT'

export interface SelfSampleLoanCreateReq {
  basNo: string
  materialType: SampleLoanMaterialType
  site: SampleLoanSite
  location: SampleLoanLocation
  sampleInfo?: string
  remark?: string
}

export interface SelfSampleLoanResp extends SelfSampleLoanCreateReq {
  id: number
  requester: string
  submitter: string
  createTime: string | number
  status: number
  requesterId: number
  submitterId: number
  returnTime?: string | number
}

export interface SampleLoanOption {
  label: string
  value: string
}

/** 项目号/BAS 下拉选项（老样本系统 reagent_item） */
export interface ReagentItemOption {
  id: number
  baseId: string
  clinicalId?: number
  clinicalName?: string
  clinicalNumber?: string
  typeId?: number
}

/** 按项目号/方案名称/方案编号模糊搜索 BAS（项目号） */
export function getReagentItemOptions(params: { keyword?: string }) {
  return http.get<ReagentItemOption[]>('/reagent/basic-data/item-options', params)
}

export function getSampleLoanSites() {
  return http.get<SampleLoanOption[]>('/reagent/sample-loan/sites')
}

export function getSampleLoanLocations(site: string) {
  return http.get<SampleLoanOption[]>('/reagent/sample-loan/locations', { site })
}

export function createSampleLoan(data: SelfSampleLoanCreateReq & { requesterId: number }) {
  return http.post<number>('/reagent/sample-loan/create', data)
}

export function getSelfSampleLoanPage(params: { pageNo: number, pageSize: number, status?: number, site?: string, location?: string, basNo?: string }) {
  return http.get<PageResult<SelfSampleLoanResp>>('/reagent/sample-loan/page-self', params)
}

export function getMobileSampleLoanPage(params: { pageNo: number, pageSize: number, status?: number, site?: string, location?: string, basNo?: string }) {
  return http.get<PageResult<SelfSampleLoanResp>>('/reagent/sample-loan/page-mobile', params)
}

export function updateSelfSampleLoan(data: SelfSampleLoanCreateReq & { id: number }) {
  return http.put<boolean>('/reagent/sample-loan/update-self', data)
}

export function returnSelfSampleLoan(id: number) {
  return http.put<boolean>(`/reagent/sample-loan/return-self?id=${id}`)
}

export function noReturnSelfSampleLoan(id: number) {
  return http.put<boolean>(`/reagent/sample-loan/no-return-self?id=${id}`)
}

export function deleteSelfSampleLoan(id: number) {
  return http.delete<boolean>(`/reagent/sample-loan/delete-self?id=${id}`)
}

export function updateAnySampleLoan(data: SelfSampleLoanCreateReq & { id: number, requesterId: number, requester: string, submitterId: number, submitter: string }) {
  return http.put<boolean>('/reagent/sample-loan/update', data)
}

export function returnAnySampleLoan(id: number) {
  return http.put<boolean>(`/reagent/sample-loan/return?id=${id}`)
}

export function noReturnAnySampleLoan(id: number) {
  return http.put<boolean>(`/reagent/sample-loan/no-return?id=${id}`)
}

export function deleteAnySampleLoan(id: number) {
  return http.delete<boolean>(`/reagent/sample-loan/delete?id=${id}`)
}

export function checkSampleLoanDuplicate(params: {
  basNo: string
  site: SampleLoanSite
  location: SampleLoanLocation
  requesterId: number
  excludeId?: number
}) {
  return http.get<boolean>('/reagent/sample-loan/check-duplicate', params)
}
