<template>
  <view class="auth-container">
    <!-- 顶部 -->
    <Header />

    <!-- 表单区域 -->
    <view class="form-container">
      <TenantPicker ref="tenantPickerRef" />
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
        <text class="text-28rpx text-[#1890ff]" @click="goToSmsLogin">
          验证码登录
        </text>
        <text class="text-28rpx text-[#1890ff]" @click="goToForgetPassword">
          忘记密码？
        </text>
      </view>
      <wd-button block :loading="loading" type="primary" @click="handleLogin">
        登录
      </wd-button>

      <!-- 第三方登录 -->
      <view class="mt-100rpx">
        <view class="divider mb-40rpx flex items-center justify-center">
          <view class="h-1rpx flex-1 bg-[#e5e5e5]" />
          <text class="px-24rpx text-26rpx text-[#999]">其他登录方式</text>
          <view class="h-1rpx flex-1 bg-[#e5e5e5]" />
        </view>
        <!-- TODO @芋艿：图标换下！ -->
        <view class="icons flex justify-center gap-60rpx">
          <view class="icon-item" @click="handleWechatLogin">
            <wd-icon name="message" size="24px" color="#07c160" />
          </view>
          <view class="icon-item" @click="handleDingTalkLogin">
            <wd-icon name="desktop" size="24px" color="#3370ff" />
          </view>
        </view>
      </view>
      <!-- 创建账号 -->
      <view class="mt-40rpx flex items-center justify-center">
        <text class="text-28rpx text-[#666]">还没有账号？</text>
        <text class="text-28rpx text-[#1890ff]" @click="goToRegister">
          创建账号
        </text>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { useToast } from '@wot-ui/ui/components/wd-toast'
import { reactive, ref } from 'vue'
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
import TenantPicker from './components/tenant-picker.vue'
import Verify from './components/verifition/verify.vue'

defineOptions({
  name: 'LoginPage',
  style: {
    navigationStyle: 'custom',
  },
})

definePage({
  style: {
    navigationStyle: 'custom',
  },
})

const toast = useToast()
const loading = ref(false) // 表单提交状态
const redirectUrl = ref<string>() // 重定向地址
const tenantPickerRef = ref<InstanceType<typeof TenantPicker>>() // 租户选择器引用
const captchaEnabled = import.meta.env.VITE_APP_CAPTCHA_ENABLE === 'true' // 验证码开关
const verifyRef = ref()
const captchaType = ref('blockPuzzle') // 滑块验证码 blockPuzzle|clickWord

const formData = reactive({
  username: import.meta.env.VITE_APP_DEFAULT_LOGIN_USERNAME || '',
  password: import.meta.env.VITE_APP_DEFAULT_LOGIN_PASSWORD || '',
  captchaVerification: '', // 验证码校验值
}) // 表单数据

/** 页面加载时处理重定向 */
onLoad((options) => {
  if (options?.redirect) {
    redirectUrl.value = ensureDecodeURIComponent(options.redirect)
  }
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
  if (!tenantPickerRef.value?.validate()) {
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

async function verifySuccess(params: any) {
  loading.value = true
  try {
    // 调用登录接口
    const tokenStore = useTokenStore()
    formData.captchaVerification = params.captchaVerification
    await tokenStore.login({
      type: 'username',
      ...formData,
    })
    // 处理跳转
    redirectAfterLogin(redirectUrl.value)
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

/** 微信登录 */
// TODO @芋艿：后续开发
function handleWechatLogin() {
  toast.info('微信登录功能开发中')
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

// 第三方登录图标
.icon-item {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f5f7fa;
}
</style>
