<template>
  <view class="search-bar" :class="{ focused: isFocused }">
    <view class="search-input-wrap">
      <text class="search-icon">🔍</text>
      <input
        type="text"
        :value="modelValue"
        :placeholder="placeholder"
        @input="handleInput"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @confirm="handleConfirm"
        class="search-input"
      />
      <text 
        class="clear-btn" 
        v-if="modelValue && isFocused"
        @click.stop="handleClear"
      >✕</text>
    </view>
    <slot name="extra"></slot>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  modelValue?: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '搜索...'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'search', value: string): void
  (e: 'clear'): void
}>()

const isFocused = ref(false)

function handleInput(e: any) {
  emit('update:modelValue', e.detail.value)
}

function handleConfirm() {
  emit('search', props.modelValue)
}

function handleClear() {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<style lang="scss" scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #FFFFFF;
  
  &.focused {
    .search-input-wrap {
      border-color: #007AFF;
      box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
    }
  }
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  background: #F5F5F5;
  border-radius: 20px;
  padding: 0 14px;
  border: 1.5px solid transparent;
  transition: all 0.2s ease;
  
  .search-icon {
    font-size: 16px;
    opacity: 0.5;
  }
  
  .search-input {
    flex: 1;
    height: 100%;
    font-size: 15px;
  }
  
  .clear-btn {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #CCCCCC;
    color: #FFFFFF;
    border-radius: 50%;
    font-size: 12px;
  }
}
</style>
