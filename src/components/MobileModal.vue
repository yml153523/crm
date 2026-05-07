<template>
  <view 
    class="modal-overlay" 
    :class="{ 'show': visible }"
    @click="handleOverlayTap"
  >
    <view 
      class="modal-content"
      @click.stop
      :style="{ maxWidth: maxWidth }"
    >
      <!-- 头部 -->
      <view class="modal-header" v-if="showHeader">
        <text class="modal-title">{{ title }}</text>
        <view class="modal-close" v-if="closable" @click="close">
          <text>✕</text>
        </view>
      </view>

      <!-- 内容区域 -->
      <scroll-view 
        class="modal-body"
        scroll-y
        :style="{ maxHeight: bodyMaxHeight }"
      >
        <slot></slot>
      </scroll-view>

      <!-- 底部按钮 -->
      <view class="modal-footer" v-if="showFooter">
        <view 
          class="btn btn-cancel" 
          v-if="showCancel"
          @click="handleCancel"
        >
          <text>{{ cancelText }}</text>
        </view>
        <view 
          class="btn btn-confirm" 
          :class="{ disabled: confirmDisabled }"
          @click="handleConfirm"
        >
          <text>{{ confirmText }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 通用移动端适配弹窗组件
 * 
 * 特性：
 * - ✅ 自动安全区域适配（刘海屏/底部指示条）
 * - ✅ 响应式高度计算
 * - ✅ 流畅的iOS滚动体验
 * - ✅ 紧凑化的间距设计
 * - ✅ 支持自定义样式覆盖
 * 
 * 使用示例：
 * <Modal 
 *   v-model:visible="showModal"
 *   title="添加课程"
 *   @confirm="handleSubmit"
 *   @cancel="handleCancel"
 * >
 *   <view>表单内容...</view>
 * </Modal>
 */

interface Props {
  visible?: boolean           // 控制显示/隐藏
  title?: string             // 标题文字
  closable?: boolean         // 是否可点击关闭按钮（默认true）
  showHeader?: boolean       // 是否显示头部（默认true）
  showFooter?: boolean       // 是否显示底部按钮（默认true）
  showCancel?: boolean       // 是否显示取消按钮（默认true）
  cancelText?: string        // 取消按钮文字
  confirmText?: string       // 确认按钮文字
  confirmDisabled?: boolean  // 确认按钮是否禁用
  closeOnOverlay?: boolean   // 点击遮罩层是否关闭（默认true）
  maxWidth?: string          // 最大宽度（默认'480px'）
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  title: '',
  closable: true,
  showHeader: true,
  showFooter: true,
  showCancel: true,
  cancelText: '取消',
  confirmText: '确定',
  confirmDisabled: false,
  closeOnOverlay: true,
  maxWidth: '480px'
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
  (e: 'close'): void
}>()

// 计算内容区域最大高度
const bodyMaxHeight = computed(() => {
  // 动态计算：视口高度 - header(50px) - footer(70px) - margin(100px)
  return `calc(100vh - 220px)`
})

function close() {
  emit('update:visible', false)
  emit('close')
}

function handleOverlayTap() {
  if (props.closeOnOverlay) {
    close()
  }
}

function handleCancel() {
  emit('cancel')
  close()
}

function handleConfirm() {
  if (!props.confirmDisabled) {
    emit('confirm')
  }
}
</script>

<style lang="scss" scoped>
/* 移动端优化版弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease-out;

  &.show {
    opacity: 1;
    pointer-events: auto;
  }
}

.modal-content {
  width: 100%;
  max-width: v-bind(maxWidth);
  max-height: calc(100vh - 80px);
  height: auto;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  transform: scale(0.95);
  transition: transform 0.25s ease-out;

  .show & {
    transform: scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  border-bottom: 1px solid #F0F0F0;
  flex-shrink: 0;

  .modal-title {
    font-size: 17px;
    font-weight: bold;
    color: #1A1A1A;
    flex: 1;
  }

  .modal-close {
    font-size: 24px;
    color: #999999;
    padding: 4px;
    line-height: 1;
    
    &:active {
      color: #666666;
    }
  }
}

.modal-body {
  padding: 16px 18px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;  /* iOS流畅滚动 */
  flex: 1;
  
  /* 隐藏滚动条但保持功能 */
  &::-webkit-scrollbar {
    display: none;
  }
}

.modal-footer {
  display: flex;
  gap: 10px;
  padding: 14px 18px;
  border-top: 1px solid #F0F0F0;
  flex-shrink: 0;

  .btn {
    flex: 1;
    height: 44px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 600;
    transition: all 0.2s ease;

    &:active {
      transform: scale(0.98);
      opacity: 0.9;
    }

    &.btn-cancel {
      background: #F5F5F5;
      color: #666666;
    }

    &.btn-confirm {
      background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
      color: #FFFFFF;

      &.disabled {
        background: #CCCCCC;
        opacity: 0.5;
        pointer-events: none;
      }

      &:not(.disabled):active {
        background: linear-gradient(135deg, #0056CC 0%, #463DB0 100%);
      }
    }
  }
}

/* 深色模式支持（可选） */
@media (prefers-color-scheme: dark) {
  .modal-content {
    background: #1C1C1E;
  }

  .modal-header {
    border-bottom-color: #2C2C2E;

    .modal-title {
      color: #FFFFFF;
    }
  }

  .modal-footer {
    border-top-color: #2C2C2E;

    .btn-cancel {
      background: #2C2C2E;
      color: #AAAAAA;
    }
  }
}
</style>
