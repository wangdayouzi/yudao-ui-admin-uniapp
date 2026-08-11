<template>
  <view class="oauth-callback-container">
    <view class="tip">
      <text class="text-30rpx text-[#333]">正在登录，请稍候…</text>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { useToast } from '@wot-ui/ui/components/wd-toast'
import type { IAuthLoginRes } from '@/api/types/login'
import { LOGIN_PAGE } from '@/router/config'
import { useTokenStore } from '@/store/token'
import {
  ensureDecodeURIComponent,
  isDoubleTokenMode,
  redirectAfterLogin,
} from '@/utils'

defineOptions({
  name: 'OAuthCallbackPage',
})

definePage({
  style: {
    navigationStyle: 'custom',
  },
  // 回调页无需登录即可访问（钉钉等 OAuth 回调落地页）
  excludeLoginPath: true,
})

const toast = useToast()
// 登录前由登录页暂存的原始跳转地址
const savedRedirectKey = 'oauthLoginRedirect'

/**
 * OAuth（如钉钉）回调落地页
 *
 * 后端回调地址形如：
 *   /h5/#/pages-core/auth/oauth-callback?token=...&refreshToken=...&expiresTime=...
 * 或：
 *   /h5/#/pages-core/auth/oauth-callback?error=...
 *
 * 职责单一：解析回调参数 → 完成登录 → 跳转
 * H5：直接完成登录并跳转首页（或登录前暂存的原始地址）
 * App：预留，可通过 web-view 打开本页，再用 uni.postMessage 把 token 回传原生层
 */
onLoad((options) => {
  // 未携带 token，说明不是合法回调，回到登录页
  if (!options?.token) {
    if (options?.error) {
      toast.error(ensureDecodeURIComponent(options.error) || '登录失败')
    }
    else {
      toast.info('无效的回调地址')
    }
    redirectToLogin()
    return
  }
  handleCallback(options)
})

/** 回调处理：解析 token 并完成登录 */
async function handleCallback(options: Record<string, any>) {
  try {
    const tokenStore = useTokenStore()
    // 根据认证模式组装 token 信息（双 token：accessToken/refreshToken/expiresTime；单 token：token/expiresIn）
    const tokenInfo: IAuthLoginRes = isDoubleTokenMode
      ? {
          accessToken: options.token,
          refreshToken: options.refreshToken || '',
          expiresTime: Number(options.expiresTime) || 0,
        }
      : {
          token: options.token,
          expiresIn: 0,
        }
    await tokenStore.oauthLogin(tokenInfo)

    // #ifdef APP-PLUS
    // App 端预留：web-view 场景下把 token 回传给原生层（需配合原生 web-view 使用）
    // @ts-ignore
    uni.postMessage({
      data: {
        type: 'oauth-login-success',
        tokenInfo,
      },
    })
    // #endif

    // 读取登录前暂存的原始跳转地址（如有），并清理
    const savedRedirect = uni.getStorageSync(savedRedirectKey) || undefined
    uni.removeStorageSync(savedRedirectKey)
    // 处理跳转（H5 直接进首页/原地址；App 原生场景由原生层接管）
    redirectAfterLogin(savedRedirect)
  }
  catch (e) {
    console.error('OAuth 登录失败:', e)
    toast.error('登录失败，请重试')
    redirectToLogin()
  }
}

/** 跳转到登录页 */
function redirectToLogin() {
  setTimeout(() => {
    uni.reLaunch({ url: LOGIN_PAGE })
  }, 1500)
}
</script>

<style lang="scss" scoped>
.oauth-callback-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;

  .tip {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20rpx;
  }
}
</style>
