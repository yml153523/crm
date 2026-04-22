/**
 * 商品管理模块 - 配置与常量
 */

export const PRODUCT_CATEGORIES = [
  { value: 'yoga', label: '瑜伽装备' },
  { value: 'pilates', label: '普拉提器材' },
  { value: 'nutrition', label: '营养补剂' },
  { value: 'clothing', label: '运动服装' },
  { value: 'other', label: '其他' }
]

export const PRODUCT_STATUS_MAP = {
  active: { label: '在售', color: '#34C759', class: 'active' },
  inactive: { label: '下架', color: '#999999', class: 'inactive' },
  low_stock: { label: '库存紧张', color: '#FF9500', class: 'low-stock' },
  out_of_stock: { label: '已售罄', color: '#FF3B30', class: 'out-of-stock' }
}

export const SORT_OPTIONS = [
  { value: 'createdAt', label: '最新上架', order: -1 },
  { value: 'salesCount', label: '销量最高', order: -1 },
  { value: 'price_asc', label: '价格从低到高', order: 1 },
  { value: 'price_desc', label: '价格从高到低', order: -1 }
]
