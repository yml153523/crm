---
name: "auto-iteration"
description: "自动迭代优化系统，实现测试→诊断→修复→优化→验证的闭环循环。当用户要求持续改进、系统优化、质量提升、达到完美状态、或执行迭代开发时调用此Skill。适用于功能上线后的质量保障、技术债务清理、性能优化、用户体验提升等场景。"
---

# 🔄 自动迭代优化系统 (Auto-Iteration Engine)

## 概述

这是一个**智能迭代优化引擎**，通过"测试→诊断→修复→优化→验证"的**无限循环**，持续改进CRM系统直到达到**完美状态**。

### 核心理念

```
┌─────────────────────────────────────────────────────────────┐
│                    🎯 迭代优化循环                           │
│                                                             │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│   │  Phase1 │ → │  Phase2 │ → │  Phase3 │ → │  Phase4 │  │
│   │ 全面测试 │    │ 问题诊断 │    │ 修复实施 │    │ 主动优化 │  │
│   └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘  │
│        │              │              │              │        │
│        ▼              ▼              ▼              ▼        │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│   │  Phase5 │ ← │  Phase6 │ ← │  Phase7 │ ← │  Phase8 │  │
│   │ 质量门禁 │    │ 回归验证 │    │ 部署上线 │    │ 用户验收 │  │
│   └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘  │
│        │              │              │              │        │
│        └──────────────┴──────────────┴──────────────┘        │
│                         │                                   │
│                    达到完美？                                │
│                    /         \                              │
│                  否            ✅ 是                         │
│                  ↓              ↓                            │
│             返回Phase1      🎉 完成！生成报告                │
└─────────────────────────────────────────────────────────────┘
```

### 适用场景

✅ **必须使用此Skill的情况**：
- 用户要求"持续优化"、"不断改进"、"直到完美"
- 系统上线后需要质量保障和稳定性提升
- 存在多个已知问题需要系统性解决
- 技术债务积累需要清理
- 性能瓶颈需要突破
- 用户体验需要全面提升

⚠️ **不适用的情况**（使用其他Skill）：
- 单个明确的BUG修复 → 使用 `bugfix-workflow`
- 新功能开发 → 使用 `feature-*` 系列Skills
- 一次性部署 → 直接使用deploy脚本

---

## 📋 迭代前准备（Phase 0）

### 0.1 初始化检查清单

在开始迭代前，**必须**完成以下检查：

```markdown
## ✅ 前置条件检查

- [ ] **代码状态确认**
  - 当前分支是否干净？（无未提交的修改）
  - 是否有正在进行的其他任务？
  
- [ ] **环境就绪**
  - 开发环境是否正常？（本地服务可启动）
  - 测试数据库是否可用？
  - 部署脚本是否可正常工作？

- [ ] **目标明确化**
  - 本次迭代的**主要目标**是什么？
    - 示例：修复所有P0/P1 BUG + 移动端适配 + 性能优化
  - **成功标准**是什么？
    - 示例：所有核心功能测试通过 + 手机端显示完整 + 页面加载<2秒
  
- [ ] **范围界定**
  - 本次迭代涉及哪些模块/页面？
  - 有哪些模块是**禁止修改**的？
  - 迭代的**时间预算**是多少轮？（建议3-5轮）
```

### 0.2 创建迭代跟踪文档

```bash
# 自动创建迭代日志目录
mkdir -p docs/iterations/{iteration_number}
# 例如：docs/iterations/round-001/
```

**文档模板**：

```markdown
# 迭代报告 Round-{N}

**开始时间**: {timestamp}
**迭代目标**: {goal}
**本轮重点**: {focus_areas}

---

## 执行记录

| Phase | 任务 | 结果 | 耗时 | 备注 |
|-------|------|------|------|------|
| P1-测试 | ... | PASS/FAIL | Xmin | ... |
| P2-诊断 | ... | 发现X个问题 | Xmin | ... |
| ... | ... | ... | ... | ... |

---

## 本轮成果

### ✅ 已解决问题
1. ...

### 🔧 已优化项
1. ...

### ⚠️ 遗留问题（下轮处理）
1. ...

### 📊 质量指标变化
- BUG数量: {before} → {after} (↓{reduction}%)
- 测试覆盖率: {before}% → {after}% (↑{increase}%)
- 性能得分: {before}/100 → {after}/100 (↑{improvement})

---

## 下一步计划
- [ ] ...
```

---

## 🔄 Phase 1: 全面测试（Comprehensive Testing）

### 1.1 测试维度矩阵

**必须覆盖以下4个维度的测试**：

#### 维度A: 功能正确性测试（Functional Correctness）

```javascript
// 测试用例示例：课程管理CRUD
describe('课程管理功能', () => {
  
  test('添加课程 - 正常场景', async () => {
    // Given: 准备测试数据
    const courseData = {
      title: '测试课程-' + Date.now(),
      description: '自动化测试',
      category: '瑜伽',
      price: 99
    }
    
    // When: 执行操作
    const response = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(courseData)
    
    // Then: 验证结果
    expect(response.status).toBe(201)
    expect(response.body.success).toBe(true)
    expect(response.body.data.course.title).toBe(courseData.title)
    expect(response.body.data.course._id).toBeDefined()
  })
  
  test('添加课程 - 缺少必填字段', async () => {
    const response = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})  // 空对象
    
    expect(response.status).toBe(400)  // 或 422
    expect(response.body.message).toContain('标题')
  })
  
  test('编辑课程 - 权限验证', async () => {
    // 使用普通用户token尝试编辑
    const response = await request(app)
      .put(`/api/courses/${courseId}`)
      .set('Authorization', `Bearer ${userToken}`)  // 非管理员
      .send({ title: '被篡改' })
    
    expect(response.status).toBe(403)  // Forbidden
  })
})
```

#### 维度B: UI/UX兼容性测试（UI/UX Compatibility）

**移动端适配检查清单**：

```yaml
# mobile-compatibility-checklist.yaml
测试设备:
  - iPhone SE (375x667)     # 小屏手机
  - iPhone 12 Pro (390x844) # 主流大屏
  - iPad (768x1024)         # 平板
  - Android Small (360x640) # Android小屏
  - Android Large (412x915)# Android大屏

检查项目:
  弹窗组件:
    - [ ] 完整显示无截断
    - [ ] 底部按钮可见可点击
    - [ ] 表单区域可滚动
    - [ ] 安全区域适配（刘海屏/底部指示条）
    
  表单元素:
    - [ ] 输入框聚焦时键盘弹出正常
    - [ ] 下拉选择器可用
    - [ ] 文本域自适应高度
    
  导航栏:
    - [ ] 左侧导航在窄屏下可折叠
    - [ ] 面包屑导航清晰
    - [ ] 返回按钮位置合理
    
  触摸交互:
    - [ ] 最小触摸区域 ≥ 44x44px
    - [ ] 按钮间距足够（防误触）
    - [ ] 滑动/长按手势响应流畅
```

#### 维度C: 性能基准测试（Performance Benchmarking）

```javascript
// performance-tests.js
const puppeteer = require('puppeteer')

describe('性能基准测试', () => {
  let browser
  let page
  
  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: true })
    page = await browser.newPage()
  })
  
  test('首页加载时间 < 3秒', async () => {
    const startTime = Date.now()
    
    await page.goto('http://120.55.195.40:8080', {
      waitUntil: 'networkidle0'
    })
    
    const loadTime = Date.now() - startTime
    
    console.log(`首页加载耗时: ${loadTime}ms`)
    expect(loadTime).toBeLessThan(3000)  // 3秒阈值
  }, 10000)  // 超时10秒
  
  test('API响应时间 < 500ms', async () => {
    const startTime = Date.now()
    
    const response = await fetch('http://120.55.195.40:5011/api/recommendations/public')
    
    const responseTime = Date.now() - startTime
    
    console.log(`API响应耗时: ${responseTime}ms`)
    expect(responseTime).toBeLessThan(500)  // 500ms阈值
    expect(response.ok).toBe(true)
  })
  
  test('弹窗打开动画流畅度 > 50fps', async () => {
    await page.goto('http://120.55.195.40:8081')
    // 登录...
    // 打开弹窗...
    
    const metrics = await page.metrics()
    console.log('页面性能指标:', metrics)
    
    // 检查是否有长时间运行的JavaScript任务
    expect(metrics.TaskDuration).toBeLessThan(100)  // < 100ms
  })
  
  afterAll(async () => {
    await browser.close()
  })
})
```

#### 维度D: 安全性扫描（Security Scan）

```bash
#!/bin/bash
# security-scan.sh

echo "=== 🔒 安全性快速扫描 ==="

# 1. 检查敏感信息泄露
echo "[1] 检查敏感信息..."
curl -s http://120.55.195.40:8081/ | grep -i "password\|secret\|token\|api_key" && echo "⚠️ 发现敏感信息！" || echo "✅ 未发现明文敏感信息"

# 2. 检查常见漏洞
echo "[2] 检查SQL注入..."
curl -s "http://120.55.195.40:5011/api/courses?title=' OR '1'='1" | head -c 200

echo "\n[3] 检查XSS..."
curl -s -X POST http://120.55.195.40:5011/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"<script>alert(1)</script>","password":"test"}'

# 3. 检查CORS配置
echo "\n[4] 检查CORS头..."
curl -sI -X OPTIONS http://120.55.195.40:5011/api/test | grep -i "access-control-allow-origin"

echo "\n=== 扫描完成 ==="
```

### 1.2 自动化测试执行

**运行命令**：

```bash
# 功能测试
npm run test:functional

# UI兼容性测试（使用BrowserStack或本地模拟器）
npm run test:ui-compatibility

# 性能测试
npm run test:performance

# 安全扫描
bash scripts/security-scan.sh

# 生成综合报告
npm run test:report
```

### 1.3 测试结果收集与分级

**问题严重度分级标准**：

| 等级 | 定义 | 处理优先级 | 本轮处理？ |
|------|------|----------|-----------|
| **P0-Critical** | 核心功能完全不可用 | 🔴 立即 | ✅ 必须 |
| **P1-Major** | 主要功能受损，但有workaround | 🟠 本轮 | ✅ 必须 |
| **P2-Minor** | 功能可用但体验差 | 🟡 下轮 | 可选 |
| **P3-Trivial** | 小瑕疵，不影响使用 | 🢩 积累后处理 | ❌ 跳过 |

**输出格式**：

```json
{
  "iteration_round": 1,
  "test_timestamp": "2026-04-20T08:00:00Z",
  "summary": {
    "total_tests": 150,
    "passed": 125,
    "failed": 20,
    "skipped": 5,
    "pass_rate": "83.3%"
  },
  "issues_found": [
    {
      "id": "ISSUE-001",
      "severity": "P0",
      "category": "functional",
      "module": "course/library.vue",
      "description": "添加课程功能无法保存",
      "test_case": "POST /api/courses returns error",
      "reproduction_steps": "1. 登录 → 2. 课程管理 → 3. 点击添加 → 4. 填写 → 5. 提交",
      "expected_behavior": "课程创建成功并显示在列表",
      "actual_behavior": "无响应或提示错误",
      "evidence": "console.log截图/API响应"
    },
    {
      "id": "ISSUE-002",
      "severity": "P1",
      "category": "ui-compatibility",
      "module": "course/library.vue",
      "description": "弹窗在iPhone SE上显示不全",
      "test_case": "Mobile viewport 375x667",
      "reproduction_steps": "1. 手机访问8081 → 2. 课程管理 → 3. 点击添加",
      "expected_behavior": "弹窗完整显示所有字段和按钮",
      "actual_behavior": "底部按钮不可见，表单被截断",
      "evidence": "device_screenshot.png"
    }
    // ... 更多问题
  ],
  "metrics": {
    "bug_count": {"before": 25, "current": 20},
    "test_coverage": {"before": "45%", "current": "52%"},
    "performance_score": {"before": 72, "current": 75},
    "accessibility_score": {"before": 68, "current": 70}
  }
}
```

---

## 🔍 Phase 2: 问题诊断（Diagnosis & Prioritization）

### 2.1 问题根因分析模板

对每个P0/P1问题，填写此模板：

```markdown
## ISSUE-{ID}: {简短描述}

### 基本信息
- **严重度**: P0/P1/P2/P3
- **影响范围**: {哪些用户/功能受影响}
- **复现率**: 必现/偶现(概率)/难以复现
- **发现方式**: 自动化测试/手动测试/用户反馈

### 复现步骤（最小化）
1. 
2. 
3. 
4. 

### 期望 vs 实际
| 项目 | 描述 |
|------|------|
| **期望** | |
| **实际** | |

### 初步假设（根因候选）
1. **假设1**: {描述}
   - 可能性: 高/中/低
   - 验证方法: {如何验证这个假设}

2. **假设2**: {描述}
   - 可能性: 高/中/低
   - 验证方法: {}

### 日志/证据
- 控制台错误:
- 网络请求:
- 截图:

### 相关代码位置
- 文件路径: 
- 行号范围: 
- 函数名: 
```

### 2.2 依赖关系分析

**识别阻塞链**：

```
ISSUE-001 (添加课程失败)
    ↓ 阻塞
ISSUE-002 (课程列表不刷新)
    ↓ 影响
ISSUE-003 (统计数据不准确)

ISSUE-004 (弹窗显示不全)  ← 独立问题，可并行处理
ISSUE-005 (API超时)       ← 独立问题
```

**分组策略**：
- **组A（阻塞链）**: 必须按顺序修复（ISSUE-001 → 002 → 003）
- **组B（独立）**: 可并行修复（ISSUE-004, 005）

### 2.3 本轮修复计划

基于**时间预算**和**影响力**，制定本轮修复列表：

```markdown
## Round-{N} 修复计划

### 必须修复（P0/P1）- 预计耗时: X小时
1. [ ] ISSUE-001: 添加课程功能异常 (预计30min)
   - 优先级: 最高
   - 影响力: 阻断核心业务
   
2. [ ] ISSUE-002: 弹窗移动端适配 (预计45min)
   - 优先级: 高
   - 影响力: 影响所有手机用户

### 建议修复（P2）- 如果时间允许
3. [ ] ISSUE-003: 加载状态优化 (预计20min)

### 延迟到下轮（P3）
- ISSUE-004: 图标颜色微调
- ISSUE-005: 提示文案优化

### 不修复（超出范围）
- ISSUE-006: 重构底层架构（风险太高）
```

---

## 🔧 Phase 3: 修复实施（Fix Implementation）

### 3.1 修复流程规范

每个问题的修复必须遵循**标准化流程**：

#### Step 1: 编写复现测试（RED阶段）

```javascript
// tests/regression/issue-001.test.js
describe('ISSUE-001: 添加课程功能异常', () => {
  
  test('应该能成功创建新课程', async () => {
    // 这个测试在修复前会FAIL（RED），修复后PASS（GREEN）
    const courseData = {
      title: '回归测试课程-' + Date.now(),
      description: '验证ISSUE-001已修复'
    }
    
    const response = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(courseData)
    
    // 断言：修复后应该通过
    expect(response.status).toBeOneOf([200, 201])
    expect(response.body.success).toBe(true)
    expect(response.body.data.course.title).toBe(courseData.title)
  })
  
  test('应该显示加载状态提示', async () => {
    // 验证UX改进
    // ...
  })
})
```

**运行测试确认失败**：
```bash
npm run test -- --grep "ISSUE-001"
# 预期: FAIL (证明问题存在)
```

#### Step 2: 定位根因并实施修复（GREEN阶段）

**最小改动原则**：
- 只修改必要的代码
- 不要趁机做无关的优化
- 保持代码风格一致
- 添加清晰的注释说明修复原因

**修复示例**：

```diff
// src/pages/admin/course/library.vue

async function submitForm() {
+ // ISSUSE-001 FIX: 使用Promise包装确保正确的异步处理
+ uni.showLoading({ title: editingCourse.value ? '保存中...' : '创建中...' })
+
  try {
    const payload = { /* ... */ }
    
-   let res: any
-   res = await uni.request({
-     url: '/api/courses',
-     method: 'POST',
-     data: payload,
-     header: { 'Authorization': `Bearer ${token}` }
-     // ❌ 缺少 Content-Type
-   })
-
-   res = res as any
+   const response = await new Promise((resolve, reject) => {
+     uni.request({
+       url: '/api/courses',
+       method: 'POST',
+       data: payload,
+       header: {
+         'Content-Type': 'application/json',  // ✅ 显式设置
+         'Authorization': `Bearer ${uni.getStorageSync('token')}`
+       },
+       success: (res) => resolve(res),
+       fail: (err) => reject(err)
+     })
+   })
+
+   uni.hideLoading()
    
    if (response.statusCode === 200 || response.statusCode === 201) {
      // 成功处理...
    } else if (response.statusCode === 401) {
+     // ✅ 新增：认证过期处理
      uni.showToast({ title: '登录已过期', icon: 'none' })
      setTimeout(() => uni.navigateTo({ url: '/pages/login' }), 1500)
    } else {
+     // ✅ 新增：详细错误提示
      const errorMsg = response.data?.message || `请求失败 (${response.statusCode})`
      uni.showToast({ title: errorMsg, icon: 'none' })
+     console.error('[课程管理] 创建失败:', errorMsg)
    }
  } catch (error: any) {
+   uni.hideLoading()  // ✅ 确保隐藏loading
    console.error('[课程管理] 异常:', error)
-   uni.showToast({ title: '网络错误', icon: 'none' })
+   uni.showToast({ title: error.errMsg || '网络错误，请重试', icon: 'none' })
  }
}
```

#### Step 3: 运行测试验证修复（验证阶段）

```bash
# 运行刚才失败的测试
npm run test -- --grep "ISSUE-001"
# 预期: PASS (证明修复有效)

# 运行完整测试套件确保无回归
npm run test
# 预期: 所有原有测试仍然通过
```

### 3.2 修复质量检查清单

每完成一个修复，**必须**确认：

```markdown
## 修复质量检查清单 - ISSUE-{ID}

### 代码质量
- [ ] 代码遵循项目现有风格
- [ ] 无硬编码的魔法数字/字符串
- [ ] 错误处理完善（不会崩溃）
- [ ] 添加了必要的注释说明修复原因
- [ ] 无引入新的警告或lint错误

### 测试覆盖
- [ ] 编写了复现测试（修复前FAIL，修复后PASS）
- [ ] 边界情况已考虑（空值/超长输入/特殊字符）
- [ ] 运行全量测试无回归

### 文档更新
- [ ] 更新了相关文档（如有）
- [ ] 记录了修复原因到git commit message
- [ ] 更新了BUG修复报告（如果适用）

### 部署准备
- [ ] 本地构建成功
- [ ] 可以通过部署脚本上传
- [ ] 准备了回滚方案（如果需要）
```

---

## ⚡ Phase 4: 主动优化（Proactive Optimization）

**超越BUG修复，主动寻找改进机会！**

### 4.1 优化维度识别

#### A. 性能优化机会

```javascript
// 性能分析工具集成
// 使用 Lighthouse / WebPageTest / Chrome DevTools

// 示例：检测慢查询
const slowQueries = await db.collection('courses')
  .find({})
  .explain('executionStats')
  
if (slowQueries.executionStats.executionTimeMillis > 100) {
  console.warn('⚠️ 慢查询 detected:', slowQueries.query)
  // 建议：添加索引
}
```

**常见优化点**：

| 优化类型 | 检测方法 | 改进措施 | 预期收益 |
|---------|---------|---------|---------|
| **API响应慢** | Performance API | 添加缓存/优化查询 | ⬇️ 响应时间50% |
| **首屏加载慢** | Lighthouse | 代码分割/懒加载 | ⬇️ FCP 30% |
| **Bundle过大** | webpack-bundle-analyzer | Tree-shaking/移除未使用代码 | ⬇️ 包体积40% |
| **内存泄漏** | Chrome Memory面板 | 清理事件监听器/定时器 | ⬇️ 内存占用60% |

#### B. 代码质量优化

```javascript
// 代码坏味道检测
// 使用 ESLint / SonarQube / CodeClimate

// 示例：重复代码检测
function findDuplicateCode(files) {
  const codeBlocks = []
  
  files.forEach(file => {
    // 提取函数体
    const functions = extractFunctions(file.content)
    codeBlocks.push(...functions)
  })
  
  // 相似度比较
  const duplicates = findSimilar(codeBlocks, threshold: 0.8)
  
  return duplicates.map(dup => ({
    file1: dup.block1.location,
    file2: dup.block2.location,
    similarity: dup.score * 100 + '%',
    suggestion: '提取为公共工具函数'
  }))
}
```

**重构机会**：

| 坏味道 | 示例 | 重构方案 | 收益 |
|--------|------|---------|------|
| **重复代码** | 4个模块都有相似的CRUD逻辑 | 提取为mixin/composable | ⬇️ 代码量30% |
| **过长函数** | submitForm有50行 | 拆分为小函数 | ⬆️ 可读性 |
| **魔法数字** | `if (statusCode === 200)` | 定义常量 `HTTP_STATUS.OK` | ⬆️ 可维护性 |
| **深层嵌套** | if→if→if→else | 早返回/卫语句 | ⬆️ 清晰度 |

#### C. 用户体验优化

**启发式评估检查表**：

```yaml
# ux-heuristics.yaml
Nielsen十大可用性原则:

1. 系统状态可见性:
   - [ ] 操作后立即反馈（loading/success/error）
   - [ ] 进度条准确反映当前状态
   - [ ] 后台任务有通知机制

2. 系统与现实匹配:
   - [ ] 使用用户熟悉的词汇（而非技术术语）
   - [ ] 遵循平台设计规范（iOS HIG/Material Design）
   
3. 用户控制与自由:
   - [ ] 危险操作有撤销机制
   - [ ] 可以轻松退出/取消
   - [ ] 提供快捷键/手势支持

4. 一致性与标准化:
   - [ ] 相同功能在不同页面表现一致
   - [ ] 颜色/图标含义统一
   - [ ] 交互模式一致

... (其余6项)
```

### 4.2 优化实施优先级矩阵

```
                    影响力
                      ↑
                      |
           高    ●Opt-1    ●Opt-2
                  /          \
        中 •Opt-4            •Opt-3• 低
              /              \
           低•Opt-5          •Opt-6
                      |
                      ↓
                   实施难度

推荐顺序: Opt-1 → Opt-3 → Opt-2 → Opt-4 → Opt-5 → Opt-6
（高影响力+低难度优先）
```

**本轮建议实施的优化**（基于当前CRM系统状况）：

1. **🥇 Opt-1: 统一API请求封装** (影响:高, 难度:低)
   - 创建`utils/request.ts`工具函数
   - 统一处理认证、错误、loading
   - 预防未来类似的BUG

2. **🥈 Opt-2: 移动端弹窗组件库** (影响:中, 难度:中)
   - 将本次修复的弹窗样式抽象为通用组件
   - 应用到视频管理、商品管理等所有弹窗
   - 一次修复，全局受益

3. **🥉 Opt-3: 添加自动化E2E测试** (影响:高, 难度:中)
   - 使用Playwright/Cypress编写关键流程测试
   - 登录→添加课程→查看列表→删除
   - 防止未来回归

---

## ✅ Phase 5: 质量门禁（Quality Gate）

### 5.1 门禁标准定义

**本轮迭代必须满足的最低标准**：

```yaml
# quality-gate.yml
version: 1.0
name: "CRM系统质量门禁"

gates:
  # 门禁1: 功能完整性
  functional_completeness:
    enabled: true
    criteria:
      - name: "核心功能测试通过率"
        threshold: ">= 95%"
        measurement: "passed_tests / total_tests"
        
      - name: "P0 BUG数量"
        threshold: "== 0"
        measurement: "count(severity == 'P0')"
        
      - name: "P1 BUG修复率"
        threshold: ">= 80%"
        measurement: "fixed_P1 / total_P1"

  # 门禁2: 代码质量
  code_quality:
    enabled: true
    criteria:
      - name: "ESLint错误数"
        threshold: "== 0"
        command: "npx eslint src/ --max-warnings=0"
        
      - name: "TypeScript编译错误"
        threshold: "== 0"
        command: "npx tsc --noEmit"
        
      - name: "代码重复率"
        threshold: "<= 10%"
        tool: "jscpd"

  # 门禁3: 性能基线
  performance:
    enabled: true
    criteria:
      - name: "首页加载时间"
        threshold: "<= 3s"
        environment: "3G network"
        
      - name: "API平均响应时间"
        threshold: "<= 500ms"
        percentile: "p95"
        
      - name: "Bundle大小"
        threshold: "<= 500KB (gzipped)"

  # 门禁4: 兼容性
  compatibility:
    enabled: true
    criteria:
      - name: "移动端弹窗完整性"
        threshold: "100% 通过"
        devices: ["iPhone SE", "iPhone 12", "Pixel 5"]
        
      - name: "浏览器兼容性"
        threshold: "Chrome 90+, Safari 14+, Firefox 88+"

  # 门禁5: 安全性
  security:
    enabled: true
    criteria:
      - name: "无明文敏感信息"
        threshold: "0 findings"
        scan: "grep -r 'password.*=.*\"[^*]' src/"
        
      - name: "依赖漏洞"
        threshold: "0 High/Critical"
        tool: "npm audit"
```

### 5.2 门禁执行与判定

```bash
#!/bin/bash
# run-quality-gate.sh

echo "🚪 开始执行质量门禁检查...\n"

# 初始化结果变量
GATE_STATUS="PASS"
FAILED_GATES=[]

# 门禁1: 功能测试
echo "📋 [1/5] 检查功能完整性..."
TEST_RESULT=$(npm run test 2>&1)
PASS_RATE=$(echo "$TEST_RESULT" | grep -oP '\d+(?=% passed)')
if [[ $PASS_RATE -lt 95 ]]; then
  GATE_STATUS="FAIL"
  FAILED_GATES+=("功能测试通过率: ${PASS_RATE}% (需>=95%)")
fi

# 门禁2: 代码质量
echo "📋 [2/5] 检查代码质量..."
LINT_RESULT=$(npx eslint src/ --format json 2>&1)
ERROR_COUNT=$(echo "$LINT_RESULT" | jq '.length')
if [[ $ERROR_COUNT -gt 0 ]]; then
  GATE_STATUS="FAIL"
  FAILED_GATES+=("ESLint错误: ${ERROR_COUNT}个")
fi

# 门禁3: 性能测试
echo "📋 [3/5] 检查性能基线..."
# ... 执行lighthouse等

# 门禁4: 兼容性
echo "📋 [4/5] 检查兼容性..."
# ... 执行browserstack测试

# 门禁5: 安全扫描
echo "📋 [5/5] 执行安全扫描..."
SECURITY_RESULT=$(npm audit 2>&1)
VULNERABILITIES=$(echo "$SECURITY_RESULT" | grep -c "critical\|high")
if [[ $VULNERABILITIES -gt 0 ]]; then
  GATE_STATUS="FAIL"
  FAILED_GATES+=("安全漏洞: ${VULNERABILITIES}个高危")
fi

# 输出最终结果
echo "\n" + "=" * 60
if [[ $GATE_STATUS == "PASS" ]]; then
  echo "✅ 质量门禁通过！可以进入下一阶段。"
  exit 0
else
  echo "❌ 质量门禁未通过！"
  echo "\n未通过的检查项:"
  for gate in "${FAILED_GATES[@]}"; do
    echo "  ❌ $gate"
  done
  echo "\n请修复上述问题后重新提交。"
  exit 1
fi
```

### 5.3 门禁结果处理

**如果门禁通过**：
```bash
✅ 进入 Phase 6 (回归验证)
```

**如果门禁未通过**：
```bash
❌ 返回 Phase 3 (修复实施)
   - 优先修复导致门禁失败的问题
   - 重新运行门禁检查
   - 最多重试 2 次
   - 如果仍失败，升级为需要人工决策的问题
```

---

## 🔄 Phase 6: 回归验证（Regression Testing）

### 6.1 回归测试策略

**分层回归测试模型**：

```
Layer 1: 冒烟测试 (Smoke Test) ~5分钟
├── 核心流程是否通
│   ├── 登录/登出
│   ├── CRUD操作（增删改查）
│   └── 关键业务流程
└── 目标：快速发现明显回归

Layer 2: 功能回归 (Functional Regression) ~15分钟
├── 所有已修复的BUG相关的测试
├── 受影响模块的全部测试
└── 目标：确保修复没有破坏其他功能

Layer 3: 全量回归 (Full Regression) ~30分钟
├── 整个测试套件
├── 包含边界情况和异常场景
└── 目标：全面保证系统稳定（发布前执行）
```

### 6.2 回归测试执行

```javascript
// regression-test-suite.js
describe('Round-{N} 回归测试套件', () => {
  
  describe('Layer 1: 冒烟测试', () => {
    test('管理员登录', async () => { /* ... */ })
    test('课程CRUD', async () => { /* ... */ })
    test('推荐内容展示', async () => { /* ... */ })
  })
  
  describe('Layer 2: 功能回归 - 已修复问题', () => {
    // ISSUE-001 的回归测试
    test('添加课程功能正常', async () => { /* ... */ })
    
    // ISSUE-002 的回归测试
    test('弹窗在移动端完整显示', async () => { /* ... */ })
    
    // 受影响的其他功能
    test('编辑课程功能正常', async () => { /* ... */ })  // 共用submitForm
    test('删除课程功能正常', async () => { /* ... */ })
  })
  
  describe('Layer 3: 全量回归 (可选)', () => {
    // 仅在发布前或重大变更后执行
    test('所有API端点响应正常', async () => { /* ... */ })
    test('所有页面可正常渲染', async () => { /* ... */ })
  })
})
```

### 6.3 回归结果分析

**回归失败处理流程**：

```
发现回归失败？
    ↓
  是
    ↓
判断严重程度
    ↓
┌─────────────┬─────────────┬─────────────┐
│   严重      │   中等      │   轻微      │
│ 核心功能失效 │ 非核心功能  │ UI微小变化  │
├─────────────┼─────────────┼─────────────┤
│ 立即停止    │ 记录问题    │ 记录但不   │
│ 返回修复    │ 继续测试    │ 阻塞发布    │
│ 重新走完    │ 发布后修复  │             │
│ 整个流程    │             │             │
└─────────────┴─────────────┴─────────────┘
```

---

## 🚀 Phase 7: 部署上线（Deployment）

### 7.1 部署前检查清单

```markdown
## 📦 部署前最终检查 (Pre-Deployment Checklist)

### 代码准备
- [ ] 所有修改已commit到Git
- [ ] Commit message符合规范（关联issue编号）
- [ ] 分支已合并到main（或release分支）
- [ ] 无merge冲突

### 构建验证
- [ ] `npm run build:user` 成功
- [ ] `npm run build:admin` 成功
- [ ] 构建产物大小合理（无异常增大）
- [ ] 无编译警告（或警告已review确认安全）

### 测试验证
- [ ] 单元测试全部通过
- [ ] 集成测试全部通过
- [ ] E2E测试全部通过
- [ ] 质量门禁通过
- [ ] 回归测试通过

### 文档更新
- [ ] README.md已更新（如需要）
- [ ] CHANGELOG.md已记录本次改动
- [ ] API文档已更新（如果有接口变动）
- [ ] 部署文档已更新（如有新流程）

### 安全检查
- [ ] 无新增的安全漏洞
- [ ] 敏感信息已从代码中移除
- [ ] 依赖版本无已知CVE
- [ ] 环境变量配置正确

### 备份方案
- [ ] 数据库备份已完成（如有DB迁移）
- [ ] 上一个版本的部署包已保留（用于回滚）
- [ ] 回滚脚本已准备好
- [ ] 回滚步骤已文档化

### 通知相关方
- [ ] 团队成员已通知（即将部署）
- [ ] 产品经理/负责人已确认
- [ ] 用户通知已准备（如有停机维护）
- [ ] 监控告警已开启
```

### 7.2 部署执行

```bash
# 使用现有的deploy.py脚本
cd /home/liuyeming/work/crm

# 部署用户端 (8080端口)
python3 scripts/deploy.py --type user

# 部署管理端 (8081端口)
python3 scripts/deploy.py --type admin

# （可选）重启API服务器
ssh root@120.55.195.40 "pm2 restart crm-server"
```

### 7.3 部署后验证

```bash
#!/bin/bash
# post-deploy-verification.sh

echo "🔍 部署后验证\n"

# 1. 服务健康检查
echo "[1/5] 检查服务状态..."
curl -sf http://120.55.195.40:8080 > /dev/null && echo "✅ 用户端(8080)正常" || echo "❌ 用户端异常"
curl -sf http://120.55.195.40:8081 > /dev/null && echo "✅ 管理端(8081)正常" || echo "❌ 管理端异常"
curl -sf http://120.55.195.40:5011/api/health > /dev/null && echo "✅ API服务(5011)正常" || echo "❌ API服务异常"

# 2. 关键功能冒烟测试
echo "\n[2/5] 冒烟测试关键功能..."
TOKEN=$(curl -s -X POST http://120.55.195.40:5011/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

if [ -n "$TOKEN" ]; then
  echo "✅ 登录功能正常"
  
  # 测试获取推荐
  RECS=$(curl -s http://120.55.195.40:5011/api/recommendations/public | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK' if d.get('success') else 'FAIL')")
  echo "✅ 推荐API: $RECS"
else
  echo "❌ 登录失败，停止后续测试"
  exit 1
fi

# 3. 页面加载测试
echo "\n[3/5] 检查页面加载..."
USER_PAGE_SIZE=$(curl -sI http://120.55.195.40:8080 | grep -i content-length | awk '{print $2}' | tr -d '\r')
ADMIN_PAGE_SIZE=$(curl -sI http://120.55.195.40:8081 | grep -i content-length | awk '{print $2}' | tr -d '\r')
echo "✅ 用户端页面大小: ${USER_PAGE_SIZE} bytes"
echo "✅ 管理端页面大小: ${ADMIN_PAGE_SIZE} bytes"

# 4. 错误日志检查
echo "\n[4/5] 检查最近错误日志..."
ERROR_COUNT=$(ssh root@120.55.195.40 "pm2 logs crm-server --lines 50 --nostream 2>&1 | grep -i 'error\|fail' | wc -l")
if [ $ERROR_COUNT -lt 3 ]; then
  echo "✅ 错误日志正常 ($ERROR_COUNT 条)"
else
  echo "⚠️ 发现较多错误 ($ERROR_COUNT 条)，请检查"
fi

# 5. 性能快照
echo "\n[5/5] 性能快照..."
START_TIME=$(date +%s%N)
curl -s http://120.55.195.40:5011/api/recommendations/public > /dev/null
END_TIME=$(date +%s%N)
ELAPSED=$(( (END_TIME - START_TIME) / 1000000 ))
echo "✅ API响应时间: ${ELAPSED}ms"

echo "\n" + "=" * 60
echo "🎉 部署验证完成！系统运行正常。"
echo "=" * 60
```

---

## 👤 Phase 8: 用户验收（User Acceptance）

### 8.1 验收测试场景

基于真实业务场景的验收测试：

```markdown
## UAT测试用例 - Round-{N}

### 场景1: 管理员日常运营流程
**角色**: 内容运营管理员
**目标**: 完成一整套内容管理操作

**步骤**:
1. 使用手机访问 http://120.55.195.40:8081
2. 登录账号 admin / 123456
3. 进入"课程管理"
4. 点击"+ 添加课程"
   - 验证: 弹窗完整显示，无截断
5. 填写课程信息:
   - 名称: "瑜伽入门-验收测试"
   - 分类: 瑜伽
   - 价格: 99
6. 点击"创建"
   - 验证: 显示"创建成功"，弹窗关闭
7. 在列表中找到刚创建的课程
   - 验证: 信息正确显示
8. 编辑该课程，修改价格为199
   - 验证: 保存成功，价格已更新
9. 删除该课程
   - 验证: 确认对话框出现，删除成功

**验收标准**:
- [ ] 所有步骤顺利完成
- [ ] 无报错或异常提示
- [ ] 操作响应时间 < 3秒
- [ ] 手机端体验流畅

---

### 场景2: 用户端浏览体验
**角色**: 普通用户（手机用户）
**目标**: 浏览推荐内容并查看详情

**步骤**:
1. 使用手机访问 http://120.55.195.40:8080
2. （无需登录）查看首页
   - 验证: "为你推荐"区域显示内容
3. 点击任意推荐卡片
   - 验证: 跳转到详情页
4. 返回首页，滚动到底部
   - 验证: 页面滚动流畅，无卡顿

**验收标准**:
- [ ] 推荐内容正确展示
- [ ] 点击跳转正常
- [ ] 移动端布局美观
- [ ] 加载速度可接受

---

### 场景3: 异常情况处理
**目标**: 验证系统的健壮性

**子场景**:
1. **网络中断**: 在提交表单时断网 → 应提示网络错误
2. **输入非法数据**: 输入超长文本/特殊字符 → 应优雅处理
3. **并发操作**: 同时在两个标签页编辑同一课程 → 应有锁机制或提示
4. **Session过期**: 长时间未操作后点击按钮 → 应提示重新登录

**验收标准**:
- [ ] 不会出现白屏或崩溃
- [ ] 错误提示友好清晰
- [ ] 数据不会损坏
```

### 8.2 验收结果记录

```yaml
# uat-results-round-{n}.yaml
uat_session:
  round: {n}
  date: 2026-04-20
  testers:
    - name: AI Automated Tester
      role: System
    - name: Human Reviewer (可选)
      role: User
  
  results:
    scenario_1_admin_workflow:
      status: PASSED  # 或 FAILED / PARTIAL
      score: 9/10
      issues: []
      comments: "所有步骤顺利，弹窗显示完美"
      
    scenario_2_user_experience:
      status: PASSED
      score: 8.5/10
      issues:
        - type: minor
          description: "推荐卡片图片加载稍慢"
          suggestion: "考虑添加懒加载或缩略图"
          
    scenario_3_error_handling:
      status: PASSED
      score: 9/10
      issues: []
      
  overall:
    status: APPROVED  # 或 NEEDS_FIX / REJECTED
    verdict: "系统质量达到上线标准"
    recommendations:
      - "建议在下轮优化图片加载性能"
      - "可以考虑增加操作引导动画"
```

---

## 🎯 循环判断：是否达到完美？

### 完美度评估模型

**多维度评分体系**：

```javascript
// perfection-score.js
function calculatePerfectionScore(metrics) {
  const weights = {
    functionality: 0.35,    // 功能完整性
    reliability: 0.25,     // 稳定性（无崩溃/错误）
    performance: 0.15,     // 性能（速度/资源）
    usability: 0.15,       // 易用性（UI/UX）
    maintainability: 0.10  // 可维护性（代码质量）
  }
  
  const scores = {
    functionality: Math.min(100, metrics.pass_rate * 100),
    reliability: 100 - (metrics.crash_count * 10),
    performance: Math.min(100, 3000 / metrics.avg_load_time),  // 3秒=100分
    usability: metrics.ux_score,  // 来自UAT评分
    maintainability: metrics.code_quality_score  // 来自SonarQube等
  }
  
  let totalScore = 0
  for (const [key, weight] of Object.entries(weights)) {
    totalScore += scores[key] * weight
  }
  
  return {
    score: Math.round(totalScore),
    grade: getGrade(totalScore),
    breakdown: scores,
    recommendation: getRecommendation(totalScore)
  }
}

function getGrade(score) {
  if (score >= 95) return 'A+ (完美)'
  if (score >= 90) return 'A (优秀)'
  if (score >= 85) return 'B+ (良好)'
  if (score >= 80) return 'B (合格)'
  return 'C (需改进)'
}

function getRecommendation(score) {
  if (score >= 95) {
    return '🎉 系统已达到完美状态！可以结束迭代或进入维护模式。'
  } else if (score >= 85) {
    return '✅ 系统质量良好。建议再进行1-2轮迭代以达到完美。'
  } else {
    return '🔄 系统仍需改进。继续迭代优化。'
  }
}
```

### 完美度等级定义

| 等级 | 分数范围 | 定义 | 行动 |
|------|---------|------|------|
| **A+ 完美** | 95-100 | 几乎无缺陷，用户体验卓越 | 🎉 **停止迭代**，进入维护模式 |
| **A 优秀** | 90-94 | 极少数小瑕疵，整体优秀 | 可选：再进行1轮微调 |
| **B+ 良好** | 85-89 | 主要功能完美，细节待打磨 | 建议：再迭代1-2轮 |
| **B 合格** | 80-84 | 功能完整，体验尚可 | 需要：继续迭代优化 |
| **C 待改进** | <80 | 存在明显问题 | 必须：回到Phase 1 |

### 本轮决策

**计算当前分数**：

```bash
# 运行完美度评估
node calculate-perfection-score.js

# 示例输出
╔══════════════════════════════════════════╗
║     🏆 CRM系统完美度评估 - Round 1       ║
╠══════════════════════════════════════════╣
║                                          ║
║  总分: 82/100                            ║
║  等级: B (合格)                          ║
║                                          ║
║  分项得分:                               ║
║  ├─ 功能完整性: 88/100 (权重35%)         ║
║  ├─ 系统稳定性: 85/100 (权重25%)         ║
║  ├─ 性能表现:    78/100 (权重15%)        ║
║  ├─ 用户体验:    80/100 (权重15%)        ║
║  └─ 可维护性:    75/100 (权重10%)        ║
║                                          ║
║  建议: 🔄 系统仍需改进，继续迭代优化     ║
╚══════════════════════════════════════════╝
```

**决策树**：

```
分数 >= 95?
    ↓
  是 → 🎉 恭喜！达到完美！
       │
       ├── 生成《完美度达成报告》
       ├── 总结本轮所有改进
       ├── 制定长期维护计划
       └── 结束迭代循环
       
  否 → 继续迭代
       │
       ├── 分析扣分项（主要短板在哪？）
       ├── 制定下轮重点改进方向
       ├── 更新迭代计划（避免重复工作）
       └── 返回 Phase 1 开始新一轮
```

---

## 📊 迭代报告生成

### 最终报告模板

当迭代结束时（无论是因为达到完美还是达到预定的轮次限制），生成完整报告：

```markdown
# 🎯 CRM系统迭代优化总结报告

**项目名称**: CRM客户关系管理系统
**迭代周期**: {start_date} → {end_date}
**总迭代轮次**: N轮
**最终完美度**: X/100 ({grade})

---

## 📈 执行总览

### 迭代历程
| 轮次 | 时间 | 重点领域 | 修复BUG数 | 优化项数 | 完美度变化 |
|------|------|---------|----------|---------|-----------|
| Round 1 | ... | ... | X | Y | 72 → 82 (+10) |
| Round 2 | ... | ... | X | Y | 82 → 89 (+7) |
| Round 3 | ... | ... | X | Y | 89 → 96 (+7) ✅ |

### 关键成就
- 🐛 累计修复 BUG: {total_bugs_fixed} 个
  - P0级: X个 (全部解决)
  - P1级: X个 (解决X%)
  - P2级: X个 (解决X%)

- ⚡ 性能提升:
  - 首页加载时间: {before}s → {after}s (↓{reduction}%)
  - API响应时间: {before}ms → {after}ms (↓{reduction}%)
  - Bundle大小: {before}KB → {after}KB (↓{reduction}%)

- 📱 兼容性改善:
  - 移动端适配: {before}个问题 → {after}个问题
  - 浏览器支持: 新增{browser}支持

- 🧪 测试覆盖:
  - 测试用例总数: {total_tests}
  - 通过率: {pass_rate}%
  - 代码覆盖率: {coverage}%

### 技术债务清理
- 重构代码: {refactored_files} 个文件
- 删除废弃代码: {deleted_lines} 行
- 添加单元测试: {new_tests} 个
- 更新文档: {updated_docs} 份

---

## 💡 最佳实践沉淀

从本次迭代中提炼的可复用经验：

### 1. 移动端适配范式
```css
/* 推荐的弹窗样式（已在全项目推广）*/
.modal-overlay {
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
}
.modal-content {
  max-height: calc(100vh - 80px);
}
.modal-body {
  -webkit-overflow-scrolling: touch;
}
```

### 2. API请求封装模式
```typescript
// utils/request.ts - 已成为项目标准
export function apiRequest(options) {
  return new Promise((resolve, reject) => {
    uni.request({
      ...options,
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      success: resolve,
      fail: reject
    })
  })
}
```

### 3. 质量门禁配置
已建立的标准门禁（可用于未来所有项目）...

---

## 🎓 经验教训

### 做得好的地方
1. ✅ ...
2. ✅ ...

### 可以改进的地方
1. ⚠️ ...
2. ⚠️ ...

### 避免的陷阱
1. ❌ ...
2. ❌ ...

---

## 🚀 未来规划

### 短期（1-2周）
- [ ] ...

### 中期（1个月）
- [ ] ...

### 长期（季度）
- [ ] ...

---

## 附录

### A. 完整的修改文件清单
| 文件 | 修改类型 | 行数变化 |
|------|---------|---------|
| ... | ... | ... |

### B. 测试报告详细数据
[链接到各轮测试报告]

### C. 性能对比图表
[嵌入图表或链接]

---

**报告生成时间**: {timestamp}
**生成者**: Auto-Iteration Engine v1.0
**审核状态**: {approved/pending}
```

---

## 🎮 使用指南：如何触发此Skill

### 方式1：显式调用
```
用户: "使用auto-iteration skill进行一轮完整迭代"
AI: [调用此Skill，执行完整流程]
```

### 方式2：隐式触发关键词
当用户说以下任一短语时，**应立即调用**此Skill：
- "持续优化"、"不断改进"、"迭代优化"
- "达到完美"、"追求极致"、"精益求精"
- "全面体检"、"系统检查"、"质量审计"
- "清理技术债务"、"代码瘦身"、"重构优化"
- "自动化测试"、"CI/CD流水线"、"质量门禁"

### 方式3：定期执行（推荐）
建议**每周执行1轮**自动迭代：
```bash
# 添加到crontab或GitHub Actions
0 9 * * 1  # 每周一早上9点执行
cd /home/liuyeming/work/crm && npm run auto-iterate
```

---

## ⚙️ 配置与自定义

### 迭代参数调整

可在 `.trae/config/auto-iteration.json` 中自定义：

```json
{
  "maxRounds": 5,
  "perfectionThreshold": 95,
  "qualityGate": {
    "functionalPassRate": 95,
    "maxLintErrors": 0,
    "performanceBudget": {
      "loadTime": 3000,
      "apiResponse": 500
    }
  },
  "scope": {
    "includeModules": ["course", "video", "product", "recommendation"],
    "excludeModules": ["legacy-system"],
    "focusAreas": ["mobile-compatibility", "api-reliability", "ux-improvement"]
  },
  "deployment": {
    "autoDeploy": false,  // 建议手动确认后再部署
    "backupBeforeDeploy": true,
    "rollbackEnabled": true
  }
}
```

---

## 📚 相关资源

### 内部资源
- [BUG修复流程](./bugfix-workflow/SKILL.md)
- [功能实现流程](./feature-implementation/SKILL.md)
- [需求澄清流程](./feature-requirements-clarification/SKILL.md)

### 外部参考
- Nielsen可用性十大原则
- Google Web Vitals
- OWASP Top 10安全实践
- 12-Factor App方法论

---

**版本**: 1.0
**最后更新**: 2026-04-20
**作者**: AI Assistant (Trae IDE)
**适用项目**: CRM系统及类似Web应用
