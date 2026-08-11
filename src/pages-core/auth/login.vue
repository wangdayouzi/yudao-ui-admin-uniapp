<template>
  <view class="auth-container">
    <!-- 顶部 -->
    <Header />

    <!-- 表单区域 -->
    <view class="form-container">
      <TenantPicker
        ref="tenantPickerRef"
        :disabled="Boolean(socialBindingContext) || authLoading"
        :preferred-tenant-id="socialBindingContext?.tenantId"
      />
      <view v-if="socialBindingContext" class="mb-24rpx rounded-12rpx bg-[#e8f4ff] px-24rpx py-20rpx text-26rpx text-[#1890ff]">
        三方授权成功，请使用账号密码登录完成绑定
      </view>
      <view class="input-item">
        <wd-icon name="user" size="20px" color="#1890ff" />
        <wd-input
          v-model="formData.username"
          placeholder="请输入用户名"
          clearable
          clear-trigger="focus"
        />
      </view>
      <view class="input-item">
        <wd-icon name="lock" size="20px" color="#1890ff" />
        <wd-input
          v-model="formData.password"
          placeholder="请输入密码"
          clearable
          clear-trigger="focus"
          show-password
        />
      </view>
      <view v-if="captchaEnabled">
        <Verify
          ref="verifyRef"
          :captcha-type="captchaType"
          explain="向右滑动完成验证"
          :img-size="{ width: '300px', height: '150px' }"
          mode="pop"
          @success="verifySuccess"
        />
      </view>

      <!-- 登录按钮 -->
      <view class="mb-2 mt-2 flex justify-between">
        <text v-if="!socialBindingContext && !authLoading" class="text-28rpx text-[#1890ff]" @click="goToSmsLogin">
          验证码登录
        </text>
        <text v-if="!authLoading" class="text-28rpx text-[#1890ff]" @click="goToForgetPassword">
          忘记密码？
        </text>
      </view>
      <wd-button block :disabled="authLoading" :loading="loading" type="primary" @click="handleLogin">
        登录
      </wd-button>

      <!-- 第三方登录 -->
      <SocialLoginPanel
        v-model="socialBindingContext"
        v-model:loading="socialLoginLoading"
        :disabled="authLoading"
        :redirect-url="redirectUrl"
        :social-bind="Boolean(pageProps.socialBind)"
        :validate-tenant="validateTenant"
        @custom="handleDingTalkLogin"
      />
      <!-- 创建账号 -->
      <view v-if="!socialBindingContext && !authLoading" class="mt-40rpx flex items-center justify-center">
        <text class="text-28rpx text-[#666]">还没有账号？</text>
        <text class="text-28rpx text-[#1890ff]" @click="goToRegister">
          创建账号
        </text>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import type { SocialLoginBindingContext } from '@/utils/social-login'
import { useToast } from '@wot-ui/ui/components/wd-toast'
import { computed, reactive, ref } from 'vue'
import { getDingTalkAuthorizeUrl } from '@/api/login'
import {
  CODE_LOGIN_PAGE,
  FORGET_PASSWORD_PAGE,
  OAUTH_CALLBACK_PAGE,
  REGISTER_PAGE,
} from '@/router/config'
import { useTokenStore } from '@/store/token'
import { ensureDecodeURIComponent, redirectAfterLogin } from '@/utils'
import Header from './components/header.vue'
import SocialLoginPanel from './components/social-login-panel.vue'
import TenantPicker from './components/tenant-picker.vue'
import Verify from './components/verifition/verify.vue'

defineOptions({
  name: 'LoginPage',
  style: {
    navigationStyle: 'custom',
  },
})

const pageProps = defineProps<{
  redirect?: string
  socialBind?: string
}>()

definePage({
  style: {
    navigationStyle: 'custom',
  },
})

const toast = useToast()
const loading = ref(false) // 表单提交状态
const redirectUrl = ref(pageProps.redirect ? ensureDecodeURIComponent(pageProps.redirect) : undefined) // 重定向地址
const tenantPickerRef = ref<InstanceType<typeof TenantPicker>>() // 租户选择器引用
const captchaEnabled = import.meta.env.VITE_APP_CAPTCHA_ENABLE === 'true' // 验证码开关
const verifyRef = ref()
const captchaType = ref('blockPuzzle') // 滑块验证码 blockPuzzle|clickWord

const formData = reactive({
  username: import.meta.env.VITE_APP_DEFAULT_LOGIN_USERNAME || '',
  password: import.meta.env.VITE_APP_DEFAULT_LOGIN_PASSWORD || '',
  captchaVerification: '', // 验证码校验值
}) // 表单数据
const socialBindingContext = ref<SocialLoginBindingContext>() // 待绑定的三方授权上下文
const socialLoginLoading = ref(false) // 三方登录进行状态
const authLoading = computed(() => loading.value || socialLoginLoading.value) // 任一登录流程进行状态
const socialAuth = computed(() => { // 待绑定的三方授权参数
  const context = socialBindingContext.value
  return context
    ? {
        socialType: context.socialType,
        socialCode: context.socialCode,
        socialState: context.socialState,
      }
    : undefined
})

/** 获取验证码 */
async function getCode() {
  // 情况一，未开启：则直接登录
  if (!captchaEnabled) {
    await verifySuccess({})
  } else {
    // 情况二，已开启：则展示验证码；只有完成验证码的情况，才进行登录
    // 弹出验证码
    verifyRef.value.show()
  }
}

/** 登录处理 */
async function handleLogin() {
  if (authLoading.value) {
    return
  }
  if (!validateTenant()) {
    return
  }
  if (!formData.username) {
    toast.warning('请输入用户名')
    return
  }
  if (!formData.password) {
    toast.warning('请输入密码')
    return
  }
  await getCode()
}

/** 验证成功后登录 */
async function verifySuccess(params: any) {
  loading.value = true
  try {
    // 调用登录接口
    const tokenStore = useTokenStore()
    formData.captchaVerification = params.captchaVerification
    await tokenStore.login({
      type: 'username',
      ...formData,
      ...socialAuth.value,
    })
    // 处理跳转
    redirectAfterLogin(socialBindingContext.value?.redirect || redirectUrl.value)
  } finally {
    loading.value = false
  }
}

/** 跳转到注册页面 */
function goToRegister() {
  uni.navigateTo({ url: REGISTER_PAGE })
}

/** 跳转到验证码登录 */
function goToSmsLogin() {
  uni.navigateTo({ url: CODE_LOGIN_PAGE })
}

/** 跳转到忘记密码 */
function goToForgetPassword() {
  uni.navigateTo({ url: FORGET_PASSWORD_PAGE })
}

/** 校验当前租户 */
function validateTenant() {
  return Boolean(tenantPickerRef.value?.validate())
}

/** 钉钉登录（新版 OAuth2，复用管理后台的登录流程） */
async function handleDingTalkLogin() {
  // #ifdef MP-WEIXIN || MP-ALIPAY
  toast.info('当前平台暂不支持钉钉登录')
  return
  // #endif
  // #ifdef H5 || APP-PLUS
  loading.value = true
  try {
    // 暂存原始跳转地址，回调落地页登录成功后跳回去
    uni.setStorageSync('oauthLoginRedirect', redirectUrl.value || '')
    // 计算回调重定向地址：指向 OAuth 回调落地页，登录成功后由回调页接收 token 参数
    const redirect = `${import.meta.env.VITE_APP_PUBLIC_BASE || '/'}#${OAUTH_CALLBACK_PAGE}`
    const url = await getDingTalkAuthorizeUrl(redirect)
    if (!url) {
      toast.warning('获取钉钉授权地址为空')
      return
    }
    console.log('[DingTalk] authorize-url:', url)
    // #ifdef H5
    // 同页跳转到钉钉授权页，登录后回调会落到 oauth-callback 落地页自动登录
    window.location.href = url
    // #endif
    // #ifdef APP-PLUS
    // App 端打开系统浏览器完成授权
    plus.runtime.openURL(url)
    // #endif
  }
  catch (e) {
    console.error('[DingTalk] 授权地址获取失败:', e)
    toast.error('钉钉登录配置异常，请联系管理员')
  }
  finally {
    loading.value = false
  }
  // #endif
}
</script>

<style lang="scss" scoped>
@import './styles/auth.scss';
</style>
