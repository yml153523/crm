#!/usr/bin/env node

/**
 * 自动化API改造脚本 - Round 3 批量处理
 *
 * 此脚本用于将剩余的uni.request调用统一替换为request.ts工具函数
 */

const fs = require('fs')
const path = require('path')

// 待处理文件列表
const filesToProcess = [
  {
    path: 'src/pages/admin/member/list.vue',
    imports: ["apiGet", "apiPost", "apiPut", "apiDelete"],
    count: 5
  },
  {
    path: 'src/pages/admin/content-hub.vue',
    imports: ["apiGet"],
    count: 3
  },
  {
    path: 'src/pages/admin/dashboard.vue',
    imports: ["apiGet"],
    count: 3
  },
  {
    path: 'src/pages/admin/statistics/index.vue',
    imports: ["apiGet"],
    count: 3
  },
  {
    path: 'src/pages/admin/course/library.vue',
    imports: ["apiGet", "apiPost", "apiPut", "apiDelete"],
    count: 4
  },
  {
    path: 'src/pages/admin/profile/index.vue',
    imports: ["apiGet", "apiPost"],
    count: 1
  },
  {
    path: 'src/pages/admin/settings/index.vue',
    imports: ["apiPost"],
    count: 1
  },
  {
    path: 'src/pages/admin/login.vue',
    imports: ["apiPost"],
    count: 1
  }
]

console.log('🚀 开始Round 3批量API改造...\n')

let totalConverted = 0
let totalFilesProcessed = 0

filesToProcess.forEach((fileInfo, index) => {
  const filePath = path.join(__dirname, fileInfo.path)

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  文件不存在: ${fileInfo.path}`)
    return
  }

  console.log(`[${index + 1}/${filesToProcess.length}] 处理: ${fileInfo.path}`)

  try {
    let content = fs.readFileSync(filePath, 'utf8')

    // 统计原始uni.request数量
    const originalCount = (content.match(/uni\.request\(/g) || []).length

    if (originalCount === 0) {
      console.log(`   ✅ 已经是最新状态（0处需要改造）`)
      return
    }

    // Step 1: 添加import语句（如果尚未添加）
    const importStatement = `import { ${fileInfo.imports.join(', ')} } from '@/utils/request'`
    if (!content.includes("from '@/utils/request'")) {
      // 在最后一个import语句后添加
      const lastImportIndex = content.lastIndexOf('import ')
      const lineEndIndex = content.indexOf('\n', lastImportIndex)
      content = content.slice(0, lineEndIndex + 1) + importStatement + '\n' + content.slice(lineEndIndex + 1)
      console.log(`   ✅ 已添加import语句`)
    }

    // Step 2: 替换GET请求
    let getReplacements = 0
    content = content.replace(
      /await\s+uni\.request\(\s*\{[\s\S]*?url:\s*['"]([^'"]+)['"][\s\S]*?method:\s*['"]GET['"][\s\S]*?data:\s*([^,]+)[\s\S]*?\}\s*\)(?:\s+as\s+any)?/g,
      (match, url, dataParam) => {
        getReplacements++
        // 清理data参数
        const cleanData = dataParam.trim().replace(/\n\s*/g, '')
        return `await apiGet('${url}', ${cleanData})`
      }
    )

    // Step 3: 替换POST请求
    let postReplacements = 0
    content = content.replace(
      /await\s+uni\.request\(\s*\{[\s\S]*?url:\s*['"]([^'"]+)['"][\s\S]*?method:\s*['"]POST['"][\s\S]*?data:\s*([^}]+)[\s\S]*?\}\s*\)(?:\s+as\s+any)?/g,
      (match, url, dataParam) => {
        postReplacements++
        const cleanData = dataParam.trim()
        return `await apiPost('${url}', ${cleanData})`
      }
    )

    // Step 4: 替换PUT请求
    let putReplacements = 0
    content = content.replace(
      /await\s+uni\.request\(\s*\{[\s\S]*?url:\s*['"]([^'"]+)['"][\s\S]*?method:\s*['"]PUT['"](?:[\s\S]*?data:\s*([^}]+))?[\s\S]*?\}\s*\)(?:\s+as\s+any)?/g,
      (match, url, dataParam) => {
        putReplacements++
        const cleanData = dataParam ? dataParam.trim() : '{}'
        return `await apiPut('${url}', ${cleanData})`
      }
    )

    // Step 5: 替换DELETE请求
    let deleteReplacements = 0
    content = content.replace(
      /await\s+uni\.request\(\s*\{[\s\S]*?url:\s*['"]([^'"]+)['"][\s\S]*?method:\s*['"]DELETE['"][\s\S]*?\}\s*\)(?:\s+as\s+any)?/g,
      (match, url) => {
        deleteReplacements++
        return `await apiDelete('${url}')`
      }
    )

    // Step 6: 简化响应判断
    content = content.replace(
      /res\.statusCode\s*===\s*200\s*&&\s*res\.data\.success/g,
      'res.success'
    )
    content = content.replace(
      /\(res\.statusCode\s*===\s*200\s*\|\|\s*res\.statusCode\s*===\s*201\)/g,
      '(res.success)'
    )
    content = content.replace(
      /res\.data\.data/g,
      'res.data'
    )

    // 移除多余的类型转换
    content = content.replace(/\n\s+res\s*=\s*res\s+as\s+any\n/g, '\n')

    // 写回文件
    fs.writeFileSync(filePath, content, 'utf8')

    const newCount = (content.match(/uni\.request\(/g) || []).length
    const convertedCount = originalCount - newCount

    totalConverted += convertedCount
    totalFilesProcessed++

    console.log(`   ✅ 完成! ${originalCount}处 → ${newCount}处残留 (转换${convertedCount}处)`)

  } catch (error) {
    console.error(`   ❌ 处理失败: ${error.message}`)
  }

  console.log('')
})

console.log('=' .repeat(60))
console.log(`🎉 Round 3 批量改造完成!`)
console.log(`   处理文件数: ${totalFilesProcessed}`)
console.log(`   总转换API调用: ${totalConverted}处`)
console.log(`   剩余待处理: 验证中...`)
console.log('=' .repeat(60))
