<template>
  <view class="yd-page-container loan-page">
    <wd-navbar title="领用管理" left-arrow placeholder safe-area-inset-top fixed @click-left="navigateBackPlus()" />

    <view class="loan-tabs">
      <view :class="{ active: activeTab === 'create' }" @click="switchTab('create')">
        {{ editingRecord ? '修改记录' : '新增领用' }}
      </view>
      <view :class="{ active: activeTab === 'records' }" @click="switchTab('records')">
        领用记录
      </view>
    </view>

    <scroll-view v-if="activeTab === 'create'" scroll-y class="min-h-0 flex-1">
      <view class="loan-intro">
        <text class="loan-intro-title">{{ editingRecord ? '修改领用记录' : '领用登记' }}</text>
        <text class="loan-intro-subtitle">{{ editingRecord ? '需求人和领用时间保持原记录' : '领用时间以提交成功时的服务器时间为准' }}</text>
      </view>

      <view v-if="createdRecord" class="success-card">
        <text class="success-title">登记成功</text>
        <text class="success-detail">{{ createdRecord.basNo }} · {{ createdRecord.requester }}</text>
        <text class="success-detail">领用时间 {{ formatDateTime(createdRecord.createTime) }}</text>
      </view>

      <view class="form-card">
        <view class="field-title">
          领用类型 <text class="required">*</text>
        </view>
        <view class="choice-row">
          <view class="choice" :class="{ selected: form.materialType === 'SAMPLE' }" @click="form.materialType = 'SAMPLE'">
            样品
          </view>
          <view class="choice" :class="{ selected: form.materialType === 'REAGENT' }" @click="form.materialType = 'REAGENT'">
            试剂
          </view>
        </view>

        <view class="field-title">
          BAS 号 <text class="required">*</text>
        </view>
        <input v-model="form.basNo" class="text-input" :maxlength="64" placeholder="请输入 BAS 号" placeholder-class="input-placeholder">

        <view class="field-title">
          站点 <text class="required">*</text>
        </view>
        <view class="choice-row">
          <view v-for="site in sites" :key="site.value" class="choice" :class="{ selected: form.site === site.value }" @click="selectFormSite(site.value)">
            {{ site.label }}
          </view>
        </view>

        <view class="field-title">
          楼层 <text class="required">*</text>
        </view>
        <view class="choice-row">
          <view v-for="location in formLocations" :key="location.value" class="choice" :class="{ selected: form.location === location.value }" @click="form.location = location.value">
            {{ location.label }}
          </view>
          <text v-if="form.site && !formLocations.length" class="no-location">该站点暂无可用楼层</text>
        </view>

        <view class="field-title">
          需求人
        </view>
        <view class="readonly-field">
          {{ editingRecord?.requester || userStore.userInfo.nickname || userStore.userInfo.username || '当前登录用户' }}
        </view>

        <view class="more-link" @click="showMore = !showMore">
          {{ showMore ? '收起选填信息' : '填写物料信息和备注（选填）' }}
        </view>
        <template v-if="showMore">
          <view class="field-title">
            物料信息
          </view>
          <textarea v-model="form.sampleInfo" class="text-area" :maxlength="500" placeholder="选填" placeholder-class="input-placeholder" />
          <view class="field-title">
            备注
          </view>
          <textarea v-model="form.remark" class="text-area" :maxlength="500" placeholder="选填" placeholder-class="input-placeholder" />
        </template>
      </view>
    </scroll-view>

    <scroll-view v-else scroll-y class="min-h-0 flex-1" @scrolltolower="loadMoreRecords">
      <view class="record-filters">
        <view class="search-row">
          <input v-model="filters.basNo" class="filter-input" placeholder="搜索 BAS 号" confirm-type="search" @confirm="refreshRecords">
          <view class="search-button" @click="refreshRecords">
            搜索
          </view>
        </view>
        <view class="filter-row">
          <view class="filter-pill" :class="{ selected: filters.status === undefined }" @click="setStatus(undefined)">
            全部
          </view>
          <view class="filter-pill" :class="{ selected: filters.status === 1 }" @click="setStatus(1)">
            可领用
          </view>
          <view class="filter-pill" :class="{ selected: filters.status === 2 }" @click="setStatus(2)">
            已归还
          </view>
          <view class="filter-pill" :class="{ selected: filters.status === 3 }" @click="setStatus(3)">
            无需归还
          </view>
        </view>
        <view class="filter-row">
          <view class="filter-pill" :class="{ selected: !filters.site }" @click="selectFilterSite(undefined)">
            全部站点
          </view>
          <view v-for="site in sites" :key="site.value" class="filter-pill" :class="{ selected: filters.site === site.value }" @click="selectFilterSite(site.value)">
            {{ site.label }}
          </view>
        </view>
        <view class="filter-row">
          <view class="filter-pill" :class="{ selected: !filters.location }" @click="setFilterLocation(undefined)">
            全部楼层
          </view>
          <view v-for="location in filterLocations" :key="location.value" class="filter-pill" :class="{ selected: filters.location === location.value }" @click="setFilterLocation(location.value)">
            {{ location.label }}
          </view>
        </view>
      </view>
      <view v-if="records.length === 0 && !recordsLoading" class="empty-records">
        暂无领用记录
      </view>
      <view v-for="record in records" :key="record.id" class="record-card">
        <view class="record-header">
          <text class="record-bas">{{ record.basNo }}</text>
          <text class="record-status">{{ statusLabel(record.status) }}</text>
        </view>
        <view class="record-meta">
          {{ record.materialType === 'REAGENT' ? '试剂' : '样品' }} · {{ siteLabel(record.site) }} · {{ record.location }} · {{ record.requester }}
        </view>
        <view class="record-meta">
          领用时间 {{ formatDateTime(record.createTime) }}
        </view>
        <view v-if="record.returnTime" class="record-meta">
          归还时间 {{ formatDateTime(record.returnTime) }}
        </view>
        <view v-if="record.sampleInfo" class="record-meta">
          物料信息 {{ record.sampleInfo }}
        </view>
        <view v-if="record.remark" class="record-meta">
          备注 {{ record.remark }}
        </view>
        <view v-if="canAct(record, 'delete') || (record.status === 1 && (canAct(record, 'update') || canAct(record, 'return') || canAct(record, 'noReturn')))" class="record-actions">
          <view v-if="record.status === 1 && canAct(record, 'update')" class="record-action" @click="editRecord(record)">
            修改
          </view>
          <view v-if="record.status === 1 && canAct(record, 'return')" class="record-action" @click="confirmAction('return', record)">
            归还
          </view>
          <view v-if="record.status === 1 && canAct(record, 'noReturn')" class="record-action" @click="confirmAction('noReturn', record)">
            无需归还
          </view>
          <view v-if="canAct(record, 'delete')" class="record-action danger" @click="confirmAction('delete', record)">
            删除
          </view>
        </view>
      </view>
      <view class="list-tip">
        {{ recordsLoading ? '加载中…' : hasMore ? '上滑加载更多' : '已显示全部记录' }}
      </view>
    </scroll-view>

    <view v-if="activeTab === 'create'" class="yd-detail-footer">
      <wd-button type="primary" block :loading="submitting" :disabled="submitting" @click="handleSubmit">
        {{ editingRecord ? '保存修改' : '确认领用' }}
      </wd-button>
    </view>
  </view>
</template>

<script lang="ts" setup>
import type { SampleLoanLocation, SampleLoanMaterialType, SampleLoanOption, SampleLoanSite, SelfSampleLoanResp } from '@/api/reagent/sample-loan'
import { checkSampleLoanDuplicate, createSelfSampleLoan, deleteAnySampleLoan, deleteSelfSampleLoan, getMobileSampleLoanPage, getSampleLoanLocations, getSampleLoanSites, noReturnAnySampleLoan, noReturnSelfSampleLoan, returnAnySampleLoan, returnSelfSampleLoan, updateAnySampleLoan, updateSelfSampleLoan } from '@/api/reagent/sample-loan'
import { useUserStore } from '@/store/user'
import { navigateBackPlus } from '@/utils'
import { formatDateTime } from '@/utils/date'

definePage({
  style: { navigationBarTitleText: '', navigationStyle: 'custom' },
})

const userStore = useUserStore()
function isOwn(record: SelfSampleLoanResp) {
  return record.requesterId === Number(userStore.userInfo.userId)
}
function hasPermission(permission: string) {
  return userStore.permissions.includes(permission) || userStore.permissions.includes('*:*:*')
}
function canAct(record: SelfSampleLoanResp, action: 'update' | 'return' | 'noReturn' | 'delete') {
  if (isOwn(record) && hasPermission('reagent:sample-loan:create'))
    return true
  if (action === 'noReturn')
    return hasPermission('reagent:sample-loan:no-return') || hasPermission('reagent:sample-loan:return')
  return hasPermission(`reagent:sample-loan:${action}`)
}
const storageKey = `sampleLoanLastLocation:${userStore.userInfo.userId}`
const saved = uni.getStorageSync(storageKey) as { site?: SampleLoanSite, location?: SampleLoanLocation } | undefined
const sites = ref<SampleLoanOption[]>([])
function siteLabel(site?: string) {
  return sites.value.find(item => item.value === (site || 'NINGBO'))?.label || site || '宁波'
}
const locationsBySite = ref<Record<string, SampleLoanOption[]>>({})
const form = reactive({
  basNo: '',
  materialType: undefined as SampleLoanMaterialType | undefined,
  site: saved?.site,
  location: saved?.location,
  sampleInfo: '',
  remark: '',
})
const showMore = ref(false)
const submitting = ref(false)
const createdRecord = ref<SelfSampleLoanResp>()
const editingRecord = ref<SelfSampleLoanResp>()
const activeTab = ref<'create' | 'records'>('create')
const records = ref<SelfSampleLoanResp[]>([])
const recordsLoading = ref(false)
const recordsTotal = ref(0)
const pageNo = ref(1)
const pageSize = 20
const hasMore = ref(true)
let listGeneration = 0
const actionLoading = ref(false)
const filters = reactive<{ basNo: string, status?: number, site?: string, location?: string }>({ basNo: '' })
const formLocations = computed(() => form.site ? locationsBySite.value[form.site] || [] : [])
const filterLocations = computed(() => filters.site
  ? locationsBySite.value[filters.site] || []
  : Array.from(new Map(Object.values(locationsBySite.value).flat().map(item => [item.value, item])).values()))

async function loadLocations(site: string) {
  if (!locationsBySite.value[site])
    locationsBySite.value[site] = await getSampleLoanLocations(site)
}
async function selectFormSite(site: string) {
  if (form.site !== site)
    form.location = undefined
  form.site = site
  await loadLocations(site)
}

function setStatus(status?: number) {
  filters.status = status
  void refreshRecords()
}
async function selectFilterSite(site?: string) {
  filters.site = site
  filters.location = undefined
  if (site)
    await loadLocations(site)
  await refreshRecords()
}
function setFilterLocation(location?: string) {
  filters.location = location
  void refreshRecords()
}

async function loadOptions() {
  sites.value = await getSampleLoanSites()
  await Promise.all(sites.value.map(site => loadLocations(site.value)))
  if (!sites.value.some(site => site.value === form.site)) {
    form.site = undefined
    form.location = undefined
  }
  if (form.site && !formLocations.value.some(location => location.value === form.location))
    form.location = undefined
}
onMounted(() => {
  void loadOptions().catch(() => notify('地点配置加载失败，请重新进入页面'))
})

function statusLabel(status: number) {
  return status === 2 ? '已归还' : status === 3 ? '无需归还' : '可领用'
}

function resetForm() {
  editingRecord.value = undefined
  form.basNo = ''
  form.materialType = undefined
  form.sampleInfo = ''
  form.remark = ''
  showMore.value = false
}

function switchTab(tab: 'create' | 'records') {
  if (tab === 'create' && editingRecord.value)
    resetForm()
  activeTab.value = tab
  if (tab === 'records') {
    createdRecord.value = undefined
    refreshRecords()
  }
}

async function refreshRecords() {
  listGeneration++
  pageNo.value = 1
  records.value = []
  recordsTotal.value = 0
  hasMore.value = true
  await loadMoreRecords()
}

async function loadMoreRecords() {
  if (recordsLoading.value || !hasMore.value)
    return
  const generation = listGeneration
  recordsLoading.value = true
  try {
    const page = await getMobileSampleLoanPage({ pageNo: pageNo.value, pageSize, ...filters, basNo: filters.basNo.trim() || undefined })
    if (generation !== listGeneration)
      return
    records.value.push(...page.list)
    recordsTotal.value = page.total
    hasMore.value = records.value.length < page.total
    pageNo.value++
  } finally {
    recordsLoading.value = false
    if (generation !== listGeneration)
      void loadMoreRecords()
  }
}

function editRecord(record: SelfSampleLoanResp) {
  if (record.status !== 1 || !canAct(record, 'update'))
    return
  editingRecord.value = record
  form.basNo = record.basNo
  form.materialType = record.materialType
  form.site = record.site || 'NINGBO'
  form.location = record.location
  void loadLocations(record.site || 'NINGBO')
  form.sampleInfo = record.sampleInfo || ''
  form.remark = record.remark || ''
  showMore.value = Boolean(form.sampleInfo || form.remark)
  createdRecord.value = undefined
  activeTab.value = 'create'
}

async function confirmAction(action: 'return' | 'noReturn' | 'delete', record: SelfSampleLoanResp) {
  if (actionLoading.value)
    return
  const label = action === 'return' ? '归还' : action === 'noReturn' ? '无需归还' : '删除'
  const choice = await uni.showModal({ title: `确认${label}`, content: `确认对 BAS 号“${record.basNo}”执行${label}？` })
  if (!choice.confirm)
    return
  actionLoading.value = true
  try {
    if (action === 'return')
      await (isOwn(record) && hasPermission('reagent:sample-loan:create') ? returnSelfSampleLoan(record.id) : returnAnySampleLoan(record.id))
    else if (action === 'noReturn')
      await (isOwn(record) && hasPermission('reagent:sample-loan:create') ? noReturnSelfSampleLoan(record.id) : noReturnAnySampleLoan(record.id))
    else
      await (isOwn(record) && hasPermission('reagent:sample-loan:create') ? deleteSelfSampleLoan(record.id) : deleteAnySampleLoan(record.id))
    notify(`已${label}`)
    await refreshRecords()
  } finally {
    actionLoading.value = false
  }
}

function notify(message: string) {
  uni.showToast({ title: message, icon: 'none' })
}

async function handleSubmit() {
  if (submitting.value)
    return
  if (!form.materialType)
    return notify('请选择领用类型')
  const basNo = form.basNo.trim()
  if (!basNo)
    return notify('请输入 BAS 号')
  if (!form.site)
    return notify('请选择站点')
  if (!form.location)
    return notify('请选择楼层')
  if (!formLocations.value.some(location => location.value === form.location))
    return notify('该楼层不可用，请重新选择')

  submitting.value = true
  try {
    const requesterId = editingRecord.value?.requesterId || Number(userStore.userInfo.userId)
    if (requesterId > 0) {
      try {
        const duplicate = await checkSampleLoanDuplicate({ basNo, site: form.site, location: form.location, requesterId, excludeId: editingRecord.value?.id })
        if (duplicate) {
          const choice = await uni.showModal({
            title: '重复领用提醒',
            content: '相同 BAS 号、站点、楼层和需求人已有未结束记录，仍要继续登记吗？',
          })
          if (!choice.confirm)
            return
        }
      } catch {
        // 重复检查失败不影响登记，后端仍校验必填字段。
      }
    }
    const payload = {
      basNo,
      materialType: form.materialType,
      site: form.site,
      location: form.location,
      sampleInfo: form.sampleInfo.trim() || undefined,
      remark: form.remark.trim() || undefined,
    }
    if (editingRecord.value) {
      if (isOwn(editingRecord.value) && hasPermission('reagent:sample-loan:create')) {
        await updateSelfSampleLoan({ ...payload, id: editingRecord.value.id })
      } else {
        await updateAnySampleLoan({
          ...payload,
          id: editingRecord.value.id,
          requesterId: editingRecord.value.requesterId,
          requester: editingRecord.value.requester,
          submitterId: editingRecord.value.submitterId,
          submitter: editingRecord.value.submitter,
        })
      }
    } else {
      createdRecord.value = await createSelfSampleLoan(payload)
    }
    try {
      uni.setStorageSync(storageKey, { site: form.site, location: form.location })
    } catch {
      // 本地偏好保存失败也不影响已成功的领用登记。
    }
    const wasEditing = Boolean(editingRecord.value)
    resetForm()
    notify(wasEditing ? '领用记录已修改' : '领用登记成功')
    if (wasEditing) {
      activeTab.value = 'records'
      await refreshRecords()
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.loan-page {
  background: #f5f7fb;
}
.loan-tabs {
  display: flex;
  background: #fff;
  border-bottom: 1rpx solid #e7edf5;
}
.loan-tabs > view {
  flex: 1;
  padding: 24rpx 0;
  color: #64758a;
  text-align: center;
  font-size: 29rpx;
}
.loan-tabs > view.active {
  color: #1768d8;
  border-bottom: 4rpx solid #1768d8;
  font-weight: 700;
}
.record-card {
  margin: 20rpx 24rpx;
  padding: 26rpx;
  background: #fff;
  border-radius: 18rpx;
}
.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.record-bas {
  color: #183153;
  font-size: 32rpx;
  font-weight: 700;
}
.record-status {
  color: #1768d8;
  font-size: 24rpx;
}
.record-meta {
  margin-top: 12rpx;
  color: #66788d;
  font-size: 25rpx;
  overflow-wrap: anywhere;
}
.record-action {
  padding: 18rpx 10rpx;
  color: #1768d8;
  font-size: 27rpx;
}
.record-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10rpx;
  margin-top: 18rpx;
  border-top: 1rpx solid #edf1f6;
}
.record-action.danger {
  color: #cb4545;
}
.record-filters {
  padding: 20rpx 24rpx;
  background: #fff;
}
.filter-input {
  flex: 1;
  min-width: 0;
  height: 72rpx;
  padding: 0 20rpx;
  background: #f5f7fb;
  border-radius: 12rpx;
}
.search-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.search-button {
  display: flex;
  height: 72rpx;
  padding: 0 28rpx;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #1768d8;
  border-radius: 12rpx;
  font-size: 26rpx;
}
.filter-row {
  display: flex;
  gap: 12rpx;
  overflow-x: auto;
  margin-top: 16rpx;
  white-space: nowrap;
}
.filter-pill {
  flex: none;
  padding: 12rpx 20rpx;
  color: #53657a;
  background: #f4f7fb;
  border-radius: 10rpx;
  font-size: 24rpx;
}
.filter-pill.selected {
  color: #1768d8;
  background: #e8f1ff;
  font-weight: 700;
}
.no-location {
  color: #8c9bae;
  font-size: 25rpx;
}
.empty-records,
.list-tip {
  padding: 50rpx 24rpx;
  color: #93a0af;
  font-size: 25rpx;
  text-align: center;
}
.list-tip {
  padding: 20rpx 24rpx 50rpx;
}
.loan-intro {
  display: flex;
  padding: 32rpx 32rpx 22rpx;
  flex-direction: column;
  gap: 8rpx;
}
.loan-intro-title {
  font-size: 42rpx;
  font-weight: 700;
  color: #183153;
}
.loan-intro-subtitle {
  font-size: 25rpx;
  color: #66788d;
}
.form-card,
.success-card {
  margin: 0 24rpx 24rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 28rpx rgb(30 70 130 / 5%);
}
.success-card {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  border-left: 6rpx solid #27a16f;
}
.success-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #167a54;
}
.success-detail {
  font-size: 25rpx;
  color: #506273;
}
.field-title {
  margin: 26rpx 0 14rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #263b53;
}
.field-title:first-child {
  margin-top: 0;
}
.required {
  color: #d84c43;
}
.choice-row {
  display: flex;
  gap: 18rpx;
}
.choice {
  display: flex;
  height: 84rpx;
  flex: 1;
  align-items: center;
  justify-content: center;
  font-size: 29rpx;
  color: #43556a;
  background: #f7f9fc;
  border: 2rpx solid #dbe3ee;
  border-radius: 14rpx;
}
.choice.selected {
  color: #1768d8;
  background: #eaf3ff;
  border-color: #3b86ed;
  font-weight: 700;
}
.text-input,
.readonly-field,
.text-area {
  width: 100%;
  padding: 0 22rpx;
  color: #243950;
  background: #f7f9fc;
  border: 2rpx solid #dbe3ee;
  border-radius: 14rpx;
  box-sizing: border-box;
}
.text-input,
.readonly-field {
  height: 88rpx;
  font-size: 30rpx;
}
.readonly-field {
  display: flex;
  align-items: center;
  color: #5c6f83;
}
.text-area {
  height: 150rpx;
  padding-top: 18rpx;
  font-size: 28rpx;
}
.input-placeholder {
  color: #9aa9b7;
}
.more-link {
  padding: 32rpx 0 4rpx;
  font-size: 27rpx;
  color: #1768d8;
}
</style>
