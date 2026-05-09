<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { onAppLaunch, onAppShow, onAppHide } from '@/utils/sync-manager'

onLaunch(() => {
  console.log('[App] Launch - 初始化同步管理器')
  onAppLaunch()
})

onShow(() => {
  console.log('[App] Show - 检查会话和数据同步')
  onAppShow()
})

onHide(() => {
  console.log('[App] Hide - 暂停后台同步')
  onAppHide()
})
</script>

<style lang="scss">
@import "./styles/common.scss";

page {
  background-color: #F5F6FA;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
