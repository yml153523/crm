# 核心功能开发任务规划

> **功能名称**: CRM核心功能升级（数据统计+视频营销+电商+红包）  
> **版本**: v1.0  
> **创建日期**: 2026-04-10  
> **预计总工时**: 10天  
> **技术方案**: [core-features-tech-design.md](./core-features-tech-design.md)

---

## 📋 功能概述

本次开发包含4个核心功能模块的完整实现：

1. **数据统计全面升级** - 替换硬编码数据为动态数据库查询
2. **视频营销功能完善** - 视频与商品关联、转化追踪
3. **产品销售（电商）功能** - 商品、购物车、订单、模拟支付
4. **任务型红包系统** - 观看/购买/注册/分享任务触发红包

---

## 🏗️ 开发阶段划分

### Phase 1: 数据库与基础架构 (Day 1-2)
**目标**: 创建所有新模型、扩展现有模型、搭建API骨架
**完成标准**: 所有Mongoose模型创建完成、基础CRUD接口可用、单元测试通过

### Phase 2: 核心业务逻辑 (Day 3-5)
**目标**: 实现所有核心业务逻辑和复杂算法
**完成标准**: 统计查询优化、购物车状态管理、订单状态机、红包领取/使用流程全部实现

### Phase 3: 前端页面开发 (Day 6-8)
**目标**: 开发所有前端页面和组件
**完成标准**: 管理端5个页面、用户端9个页面、4个公共组件全部可用

### Phase 4: 测试与部署 (Day 9-10)
**目标**: 全量测试、Bug修复、服务器部署
**完成标准**: 所有AC验证通过、生产环境可访问

---

## ✅ 任务清单

### Phase 1: 数据库与基础架构

#### Task-01: 创建商品数据模型 (Product)
- **通俗解释**: 设计商品的数据库表结构，包含名称、价格、图片、库存等字段
- **说明**: 
  - 新建 `server/models/Product.js`
  - 包含字段：name, description, category, price, originalPrice, coverImage, images[], stock, salesCount, rating, variants[], status, tags, relatedVideoId, slug
  - 添加索引：category+status+salesCount复合索引，name全文搜索索引
  - 验证规则：price>0, stock>=0, required字段检查
- **涉及文件**: 
  - `server/models/Product.js` (新建)
- **测试文件**: `server/tests/models/product.test.js` (新建)
- **对应AC**: SHOP-001, SHOP-008, SHOP-010
- **依赖**: 无
- **验证标准**:
  - [ ] Product模型可以成功创建实例
  - [ ] 必填字段缺失时抛出验证错误
  - [ ] 价格和库存边界值处理正确
  - [ ] 复合索引创建成功
  - [ ] slug自动生成且唯一

---

#### Task-02: 创建购物车数据模型 (Cart)
- **通俗解释**: 设计购物车的表结构，记录用户添加了哪些商品、数量多少
- **说明**:
  - 新建 `server/models/Cart.js`
  - 包含字段：userId, productId, quantity, variantName, price(快照), addedAt
  - 唯一约束：(userId + productId) 组合唯一
  - quantity最小值为1
- **涉及文件**:
  - `server/models/Cart.js` (新建)
- **测试文件**: `server/tests/models/cart.test.js` (新建)
- **对应AC**: SHOP-003, SHOP-004
- **依赖**: Task-01 (需要Product模型存在)
- **验证标准**:
  - [ ] 同一用户添加同一商品时更新数量而非新增记录
  - [ ] 不同用户可以有独立的购物车
  - [ ] quantity不能小于1
  - [ ] price快照在添加时锁定

---

#### Task-03: 创建订单数据模型 (Order)
- **通俗解释**: 设计订单表结构，记录完整的交易信息（商品、金额、支付、物流）
- **说明**:
  - 新建 `server/models/Order.js`
  - 核心字段：orderNo(唯一), userId, items[](商品明细快照), totalAmount, discountAmount, finalAmount, paymentMethod, paymentStatus, status(状态机), shippingAddress{}, logistics信息
  - 订单状态枚举：pending_payment → paid → shipping → delivered → completed / cancelled / refunded
  - Pre-save中间件：自动生成订单号（格式：YYYYMMDD+4位随机数）
  - 索引：userId+createdAt, orderNo唯一, status+createdAt
- **涉及文件**:
  - `server/models/Order.js` (新建)
- **测试文件**: `server/tests/models/order.test.js` (新建)
- **对应AC**: SHOP-005, SHOP-006, SHOP-007, SHOP-009
- **依赖**: Task-01 (items引用Product)
- **验证标准**:
  - [ ] 订单号自动生成且唯一
  - [ ] items数组正确存储商品快照
  - [ ] 默认状态为pending_payment
  - [ ] shippingAddress嵌套对象验证完整
  - [ ] 金额计算逻辑正确（total = sum(items.subtotal) + shippingFee - discount）

---

#### Task-04: 创建支付记录模型 (Payment)
- **通俗解释**: 记录每笔支付的详细信息（支付方式、金额、第三方流水号）
- **说明**:
  - 新建 `server/models/Payment.js`
  - 字段：orderId, orderNo, userId, amount, method(mock/wechat/alipay), transactionId, status(created→processing→success/failed/closed), callbackData, paidAt
  - 关联Order模型
- **涉及文件**:
  - `server/models/Payment.js` (新建)
- **测试文件**: `server/tests/models/payment.test.js` (新建)
- **对应AC**: SHOP-006
- **依赖**: Task-03 (引用Order)
- **验证标准**:
  - [ ] Payment与Order正确关联
  - [ ] 支付方式枚举校验通过
  - [ ] transactionId可为空（未支付时）

---

#### Task-05: 创建红包领取记录模型 (RedPacketRecord)
- **通俗解释**: 记录谁领了哪个红包、领了多少、是否已使用、何时过期
- **说明**:
  - 新建 `server/models/RedPacketRecord.js`
  - 字段：redPacketId, userId, amount, status(available/used/expired/refunded), taskCompletedAt, taskEvidence{videoWatchDuration, orderId}, usedAt, usedOrderId, usedAmount, expiresAt
  - 部分唯一索引：(redPacketId + userId) 在status=available时唯一（防止重复领取）
- **涉及文件**:
  - `server/models/RedPacketRecord.js` (新建)
- **测试文件**: `server/tests/models/red-packet-record.test.js` (新建)
- **对应AC**: RP-003, RP-004, RP-005, RP-008
- **依赖**: 无（独立模型）
- **验证标准**:
  - [ ] 同一用户对同一红包只能有一条available记录
  - [ ] 过期时间根据红包配置自动计算
  - [ ] taskEvidence灵活存储不同类型凭证

---

#### Task-06: 扩展现有Video模型（添加营销字段）
- **通俗解释**: 给现有的视频表增加商品关联、转化率等营销相关字段
- **说明**:
  - 修改 `server/models/Video.js`
  - 新增字段：productId, productIds[], categoryPath, tags[], isMarketing, marketingType(product_intro/tutorial/testimonial/live), ctaText, ctaLink, conversionRate, viewToOrderCount
  - 新增索引：categoryPath+status+createdAt, productId+isMarketing
  - 向后兼容：所有新字段都有默认值
- **涉及文件**:
  - `server/models/Video.js` (修改)
- **测试文件**: `server/tests/models/video-extension.test.js` (新建)
- **对应AC**: VIDEO-001, VIDEO-002, VIDEO-005
- **依赖**: Task-01 (productId引用Product)
- **验证标准**:
  - [ ] 现有视频数据不受影响（向后兼容）
  - [ ] 可以关联单个或多个商品
  - [ ] 营销类型枚举校验通过
  - [ ] ctaLink可以是内部路径或外部URL

---

#### Task-07: 扩展现有RedPacket模型（添加任务型字段）
- **通俗解释**: 给现有红包表增加任务类型、领取限制、使用规则等字段
- **说明**:
  - 修改 `server/models/RedPacket.js`
  - 新增字段：taskType(watch_video/purchase_product/register/share/checkin/manual), taskConfig{targetId, targetType, requiredDuration, minPurchaseAmount...}, claimRules{maxClaimsPerUser, levelRequired, newUserOnly..., claimStartTime/End}, usageRules{minOrderAmount, applicableCategories[], expireAfterClaim, canStack}, stats{sentCount, claimedCount, usedCount...}
  - 扩展status枚举：增加draft/paused
- **涉及文件**:
  - `server/models/RedPacket.js` (修改)
- **测试文件**: `server/tests/models/red-packet-extension.test.js` (新建)
- **对应AC**: RP-001, RP-002, RP-009
- **依赖**: 无
- **验证标准**:
  - [ ] 现有红包数据不受影响
  - [ ] taskType枚举包含所有支持的类型
  - [ ] claimRules嵌套对象验证完整
  - [ ] stats字段默认值为0

---

#### Task-08: 创建统计API路由骨架 (statistics.js)
- **通俗解释**: 创建统计模块的后端API入口文件，定义路由结构
- **说明**:
  - 新建 `server/routes/statistics.js`
  - 定义路由：
    - GET /api/statistics/overview?period=today|week|month|year
    - GET /api/statistics/top-videos?limit=10&period=week
    - GET /api/statistics/insights?period=week
    - GET /api/statistics/trend?metric=users|revenue&days=30
  - 目前只返回mock数据或空响应（后续Task填充真实逻辑）
  - 注册到 server.js
- **涉及文件**:
  - `server/routes/statistics.js` (新建)
  - `server/server.js` (修改 - 添加 app.use('/api/statistics', statisticsRoutes))
- **测试文件**: `server/tests/routes/statistics.test.js` (新建)
- **对应AC**: STAT-001~STAT-008
- **依赖**: Task-01~07 (可能引用多个模型)
- **验证标准**:
  - [ ] 路由可以正常访问（不报404）
  - [ ] period参数校验通过
  - [ ] 返回格式符合规范 {success, data}
  - [ ] 错误处理正常（无效period返回400）

---

#### Task-09: 创建商品API路由 (product.js)
- **通俗解释**: 创建商品管理的后端API（列表、详情、搜索、CRUD）
- **说明**:
  - 新建 `server/routes/product.js`
  - 用户端API：
    - GET /api/products?page=&pageSize=&category=&sort=(sales|price|new)
    - GET /api/products/:id (含relatedProducts)
    - GET /api/products/search?keyword=
  - 管理端API：
    - POST /api/admin/products (创建)
    - PUT /api/admin/products/:id (更新)
    - DELETE /api/admin/products/:id (删除)
    - PATCH /api/admin/products/:id/status (上下架)
  - 图片上传支持（Multer）
- **涉及文件**:
  - `server/routes/product.js` (新建)
  - `server/server.js` (修改 - 注册路由)
- **测试文件**: `server/tests/routes/product.test.js` (新建)
- **对应AC**: SHOP-001, SHOP-002, SHOP-008
- **依赖**: Task-01
- **验证标准**:
  - [ ] 商品列表分页正确
  - [ ] 分类筛选有效
  - [ ] 排序功能正常（sales/price/new）
  - [ ] 详情页返回完整信息
  - [ ] 搜索支持全文匹配
  - [ ] 权限控制（admin接口需认证）

---

#### Task-10: 创建购物车API路由 (cart.js)
- **通俗解释**: 实现购物车的增删改查API
- **说明**:
  - 新建 `server/routes/cart.js`
  - API列表：
    - GET /api/cart (获取购物车，含商品详情和总金额)
    - POST /api/cart (添加商品，参数：productId, quantity, variantName)
    - PUT /api/cart/item/:itemId (修改数量)
    - DELETE /api/cart/item/:itemId (删除单项)
    - DELETE /api/cart/clear (清空购物车)
  - 业务逻辑：
    - 添加时检查商品是否存在、是否有库存
    - 已存在的商品更新quantity而非新增
    - 删除时返回更新后的购物车数据
- **涉及文件**:
  - `server/routes/cart.js` (新建)
  - `server/server.js` (修改)
- **测试文件**: `server/tests/routes/cart.test.js` (新建)
- **对应AC**: SHOP-003, SHOP-004
- **依赖**: Task-01, Task-02
- **验证标准**:
  - [ ] 添加商品到购物车成功
  - [ ] 重复添加同一商品时数量累加
  - [ ] 修改数量后总金额重新计算
  - [ ] 删除商品后购物车更新
  - [ ] 清空购物车后GET返回空数组
  - [ ] 库存不足时拒绝添加

---

#### Task-11: 创建订单API路由 - 基础部分 (order.js Part 1)
- **通俗解释**: 实现订单的创建、列表、详情API
- **说明**:
  - 新建 `server/routes/order.js`
  - API列表：
    - POST /api/orders (创建订单)
      - Body: { items[{productId, quantity, variantName}], shippingAddress{}, buyerRemark, redPacketId }
      - 逻辑：验证商品存在→检查库存→计算金额→生成订单号→创建Order记录
    - GET /api/orders?status=all|pending_payment|paid|...&page= (订单列表)
    - GET /api/orders/:id (订单详情，含商品和支付信息)
  - 创建订单时的金额计算：
    - totalAmount = Σ(items[i].price × items[i].quantity) + shippingFee
    - finalAmount = totalAmount - discountAmount (后续Task实现红包抵扣)
- **涉及文件**:
  - `server/routes/order.js` (新建)
  - `server/server.js` (修改)
- **测试文件**: `server/tests/routes/order.test.js` (新建)
- **对应AC**: SHOP-005, SHOP-007, SHOP-009
- **依赖**: Task-01, Task-03
- **验证标准**:
  - [ ] 订单创建成功，返回orderNo
  - [ ] items正确保存商品快照
  - [ ] shippingAddress完整存储
  - [ ] 金额计算准确
  - [ ] 订单列表按状态过滤正确
  - [ ] 订单详情包含完整信息

---

#### Task-12: 创建订单API路由 - 支付部分 (order.js Part 2)
- **通俗解释**: 实现模拟支付、取消订单、确认收货API
- **说明**:
  - 在 `server/routes/order.js` 中继续添加：
    - POST /api/orders/:id/pay (模拟支付)
      - Body: { paymentMethod: "mock" }
      - 逻辑：验证订单状态→创建Payment记录→更新Order.status=paid→更新商品salesCount
    - POST /api/orders/:id/cancel (取消订单)
      - 条件：仅pending_payment状态可取消
    - POST /api/orders/:id/confirm (确认收货)
      - 条件：仅delivered状态可确认
  - 模拟支付实现：
    - transactionId格式：MOCK_{timestamp}_{random}
    - 自动设置paidAt时间戳
- **涉及文件**:
  - `server/routes/order.js` (继续编辑)
- **测试文件**: `server/tests/routes/order-payment.test.js` (新建)
- **对应AC**: SHOP-006
- **依赖**: Task-03, Task-04, Task-11
- **验证标准**:
  - [ ] 模拟支付成功，Payment记录创建
  - [ ] Order.status从pending_payment变为paid
  - [ ] Order.paidAt和transactionId已设置
  - [ ] 商品salesCount正确递增
  - [ ] 取消订单仅特定状态允许
  - [ ] 确认收货状态流转正确

---

#### Task-13: 创建红包API路由 (red-packet.js)
- **通俗解释**: 实现红包活动的管理和用户领取/使用API
- **说明**:
  - 新建 `server/routes/red-packet.js`
  - 管理员API：
    - POST /api/admin/red-packets (创建活动)
    - GET /api/admin/red-packets?status= (活动列表)
    - GET /api/admin/red-packets/:id (详情+统计)
    - POST /api/admin/red-packets/:id/send (手动发放)
  - 用户API：
    - GET /api/red-packets/available?taskType=&targetId= (可领取列表)
    - POST /api/red-packets/:id/claim (领取红包)
      - Body: { taskEvidence: {...} }
    - GET /api/my/red-packets?status= (我的红包)
  - 基础实现（详细逻辑在Phase 2补充）
- **涉及文件**:
  - `server/routes/red-packet.js` (新建)
  - `server/server.js` (修改)
- **测试文件**: `server/tests/routes/red-packet.test.js` (新建)
- **对应AC**: RP-001~RP-010
- **依赖**: Task-05, Task-07
- **验证标准**:
  - [ ] 创建红包活动成功
  - [ ] 可领取列表按taskType过滤
  - [ ] 领取红包基础流程通
  - [ ] 我的红包按status分组显示
  - [ ] 手动发放成功

---

#### Task-14: 更新server.js注册所有新路由
- **通俗解释**: 将所有新建的路由模块注册到Express应用中
- **说明**:
  - 修改 `server/server.js`
  - 添加require语句导入新路由
  - 添加app.use()挂载路由
  - 路径映射：
    - /api/statistics → statisticsRoutes
    - /api/products → productRoutes (用户端)
    - /api/admin/products → adminProductRoutes (管理端)
    - /api/cart → cartRoutes
    - /api/orders → orderRoutes
    - /api/red-packets → redPacketRoutes (用户端)
    - /api/admin/red-packets → adminRedPacketRoutes (管理端)
- **涉及文件**:
  - `server/server.js` (修改)
- **测试文件**: 无（集成测试覆盖）
- **对应AC**: 所有模块的基础连通性
- **依赖**: Task-08~13
- **验证标准**:
  - [ ] 所有路由都可以访问（不报404）
  - [ ] 路由顺序正确（静态资源在前，API在后）
  - [ ] PM2重启无报错
  - [ ] Health check通过

---

### Phase 2: 核心业务逻辑

#### Task-15: 实现统计数据聚合查询逻辑
- **通俗解释**: 编写复杂的数据库查询代码，从多个表汇总真实的运营数据
- **说明**:
  - 完善 `server/routes/statistics.js` 的具体实现
  - getOverview(period):
    - 并行查询User.count, VideoWatch.distinct, Order.count, RedPacketRecord.count
    - 计算环比增长率（对比上一周期）
    - 生成chartData（近7天趋势数据）
  - getTopVideos(period):
    - VideoWatch聚合：$group by videoId, $sort by count
    - 关联Video表获取title, duration
    - 计算completionRate = completedCount / viewCount * 100
  - getInsights(period):
    - 基于数据变化率生成洞察文案模板
    - 示例："本周用户增长XX%，主要来源为XX"
- **涉及文件**:
  - `server/routes/statistics.js` (继续编辑)
- **测试文件**: `server/tests/statistics/aggregation.test.js` (新建)
- **对应AC**: STAT-001~STAT-008
- **依赖**: Task-08, Task-11, Task-13 (需要实际数据)
- **验证标准**:
  - [ ] today/week/month/year 四个维度数据不同
  - [ ] 环比增长率计算准确
  - [ ] chartData包含7个数据点
  - [ ] topVideos按观看量降序排列
  - [ ] completionRate百分比正确
  - [ ] insights内容基于真实数据生成

---

#### Task-16: 实现购物车状态管理逻辑
- **通俗解释**: 完善购物车的业务规则（库存检查、价格同步、并发处理）
- **说明**:
  - 完善 `server/routes/cart.js`
  - 添加商品时：
    - 检查Product是否存在且status=active
    - 检查stock > 0
    - 如果已有该商品，比较当前price与cart中的price，如不同则提示"商品价格已调整"
    - 返回更新后的完整购物车（含product详情、totalAmount、itemCount）
  - 修改数量时：
    - 校验新quantity <= product.stock
    - 如果超库存则将quantity设为stock并提示"库存不足，已调整为您最大可购数量"
  - 删除商品后重新计算总金额
- **涉及文件**:
  - `server/routes/cart.js` (继续编辑)
- **测试文件**: `server/tests/cart/business-rules.test.js` (新建)
- **对应AC**: SHOP-003, SHOP-004, SHOP-010
- **依赖**: Task-10
- **验证标准**:
  - [ ] 下架商品无法加入购物车
  - [ ] 库存为0的商品无法加入
  - [ ] 数量超过库存时自动调整并提示
  - [ ] 商品涨价时提醒用户
  - [ ] 总金额实时准确

---

#### Task-17: 实现订单创建完整流程（含红包抵扣）
- **通俗解释**: 编写下单的核心逻辑，包括金额计算、库存扣减、红包使用
- **说明**:
  - 完善 `POST /api/orders` 实现
  - 步骤：
    1. 验证用户身份（JWT token）
    2. 验证所有items中productId有效且status=active
    3. 批量检查库存充足性（任一不足则整个订单失败）
    4. 如果传了redPacketId：
       - 验证红包记录存在且status=available
       - 验证红包未过期
       - 验证订单金额 >= minOrderAmount
       - 计算discountAmount = min(redPacket.amount, totalAmount)
    5. 计算finalAmount = totalAmount - discountAmount
    6. 生成orderNo（调用工具函数）
    7. 创建Order记录（使用session事务）
    8. 如使用了红包，标记redPacketRecord为"已绑定待使用"
    9. 返回订单信息和支付跳转URL
  - 错误处理：任一步骤失败回滚
- **涉及文件**:
  - `server/routes/order.js` (继续编辑)
  - `server/utils/order-no-generator.js` (新建 - 工具函数)
- **测试文件**: `server/tests/order/creation-flow.test.js` (新建)
- **对应AC**: SHOP-005, SHOP-009, RP-006, RP-007
- **依赖**: Task-11, Task-16
- **验证标准**:
  - [ ] 正常下单流程完整
  - [ ] 使用红包后finalAmount减少
  - [ ] 红包抵扣不超过订单金额
  - [ ] 不满足最低消费时报错
  - [ ] 库存不足时整体失败
  - [ ] 事务保证原子性

---

#### Task-18: 实现红包领取核心算法
- **通俗解释**: 编写红包领取的完整业务逻辑（任务验证、防刷、金额计算）
- **说明**:
  - 完善 `POST /api/red-packets/:id/claim` 实现
  - 流程（使用MongoDB session事务）：
    1. 查找redPacket，验证status=active且在时间范围内
    2. 检查remainingCount > 0 && remainingAmount > 0
    3. 检查用户领取次数 < maxClaimsPerUser
    4. 根据**taskType**验证任务完成情况：
       - watch_video: 查VideoWatch记录，watchedDuration >= requiredDuration
       - purchase_product: 查Order记录，status=completed
       - register: 检查用户createdAt在活动开始后
       - share: 查ShareRecord（如果有的话）
    5. 计算领取金额：
       - fixed类型: amount = totalAmount / totalCount
       - random类型: 二倍均值法算法
    6. 创建RedPacketRecord（status=available）
    7. 更新RedPacket统计（remainingCount--, remainingAmount--, stats++）
    8. 如果remainingCount变为0，设置status=finished
    9. 提交事务
  - 防刷机制：
    - 同一IP短时间限制（可选Redis）
    - 用户频率限制（内存计数器）
- **涉及文件**:
  - `server/routes/red-packet.js` (继续编辑)
  - `server/utils/red-packet-algorithm.js` (新建 - 随机金额算法)
- **测试文件**: `server/tests/red-packet/claim-flow.test.js` (新建)
- **对应AC**: RP-002, RP-003, RP-004, RP-009, RP-010
- **依赖**: Task-13
- **验证标准**:
  - [ ] 任务型红包需要完成任务才能领
  - [ ] 同一用户重复领取报错
  - [ ] 固定金额红包每人金额相同
  - [ ] 随机金额红包金额分布合理
  - [ ] 红包发完后status变finished
  - [ ] 事务保证一致性

---

#### Task-19: 实现红包过期定时任务
- **通俗解释**: 编写定时扫描脚本，自动将过期红包标记为expired状态
- **说明**:
  - 新建 `server/crons/red-packet-expiry.js`
  - 使用 node-cron 库（需安装）
  - 逻辑：
    - 每小时执行一次
    - 查找 RedPacketRecord 中 status=available 且 expiresAt < now 的记录
    - 批量更新为 status='expired'
    - 查找 RedPacket 中 endTime < now 且 status=active 的记录
    - 批量更新为 status='expired'
    - 输出日志：过期了X个红包记录，Y个红包活动
  - 在 server.js 启动时初始化cron job
- **涉及文件**:
  - `server/crons/red-packet-expiry.js` (新建)
  - `server/server.js` (修改 - 启动cron)
- **测试文件**: `server/tests/crons/expiry.test.js` (新建)
- **对应AC**: RP-005
- **依赖**: Task-05, Task-07
- **验证标准**:
  - [ ] cron表达式正确（每小时第0分钟）
  - [ ] available记录过期后变为expired
  - [ ] active活动结束后变为expired
  - [ ] 日志输出清晰

---

#### Task-20: 实现视频转化追踪逻辑
- **通俗解释**: 记录用户从视频到商品的转化行为（点击CTA、查看商品、加购）
- **说明**:
  - 在 `server/routes/video.js` 中扩展：
    - POST /api/videos/:id/conversion
      - Body: { action: "click_cta" | "view_product" | "add_to_cart", userId }
      - 记录到Conversion模型（或在VideoStats中）
      - 更新Video.conversionRate和viewToOrderCount
  - 统计conversionRate的方法：
    - conversionRate = (click_cta_count / viewCount) * 100
    - 或基于实际下单数：viewToOrderCount / viewCount * 100
- **涉及文件**:
  - `server/routes/video.js` (扩展)
- **测试文件**: `server/tests/video/conversion.test.js` (新建)
- **对应AC**: VIDEO-003, VIDEO-004, VIDEO-006
- **依赖**: Task-06, Task-09
- **验证标准**:
  - [ ] 转化事件被正确记录
  - [ ] 不同action类型区分存储
  - [ ] conversionRate计算准确
  - [ ] 防刷：同一用户短时间内不重复计数

---

### Phase 3: 前端页面开发

#### Task-21: 重构数据统计页面（替换硬编码）
- **通俗解释**: 把statistics/index.vue里的假数据全部删掉，改成从API动态加载
- **说明**:
  - 修改 `src/pages/admin/statistics/index.vue`
  - 删除硬编码的 statCards (L142-171)、topVideos (L186-192)、insights (L194-210)、chartData (L176-184)
  - 添加：
    - ref变量: statCards([]), loading(false), currentTime(0)
    - async function loadStatistics(period): 调用 GET /api/statistics/overview?period=xxx
    - async function loadTopVideos(): 调用 GET /api/statistics/top-videos
    - async function loadInsights(): 调用 GET /api/statistics/insights
    - onMounted() 中并行加载三个接口
  - handleTimeChange(index): 改为重新请求API（不再切换本地数据）
  - refreshChart(): 改为真实刷新（不再随机数）
  - 添加loading状态显示和error处理
- **涉及文件**:
  - `src/pages/admin/statistics/index.vue` (大改)
- **测试文件**: 手动测试（浏览器验证）
- **对应AC**: STAT-001~STAT-008
- **依赖**: Task-15 (API必须就绪)
- **验证标准**:
  - [ ] 页面打开时显示loading
  - [ ] API返回后显示真实数据
  - [ ] 切换今日/本周/本月/本年数据变化
  - [ ] 显示正确的环比增长率和箭头方向
  - [ ] 趋势图显示真实数据点
  - [ ] 热门视频排行来自DB
  - [ ] 刷新按钮重新拉取
  - [ ] 无数据时显示空状态提示

---

#### Task-22: 开发商品列表页面 (用户端)
- **通俗解释**: 做一个商品浏览页面，像淘宝/京东那样展示商品网格
- **说明**:
  - 新建 `src/pages/user/product/list.vue`
  - UI组件：
    - 顶部搜索栏
    - 分类Tab（全部/维生素/保健品/器械/其他）
    - 排序选项（销量/价格/最新）
    - 商品卡片网格（2列布局）
    - 卡片内容：封面图、名称、价格（原价划线）、销量、标签(new/hot)
    - 下拉加载更多（分页）
    - 空状态提示
  - API调用：GET /api/products?page=&category=&sort=
  - 点击商品跳转详情页
- **涉及文件**:
  - `src/pages/user/product/list.vue` (新建)
  - `src/api/product.ts` (新建 - API封装)
- **测试文件**: 手动测试
- **对应AC**: SHOP-001
- **依赖**: Task-09
- **验证标准**:
  - [ ] 商品以网格形式展示
  - [ ] 分类筛选生效
  - [ ] 排序切换生效
  - [ ] 下拉加载更多
  - [ ] 点击跳转详情

---

#### Task-23: 开发商品详情页面 (用户端)
- **通俗解释**: 做一个商品详情页，展示图片、价格、规格选择、加购按钮
- **说明**:
  - 新建 `src/pages/user/product/detail.vue`
  - UI组件：
    - 图片轮播（coverImage + images[]）
    - 商品标题、价格、原价、销量、评分
    - 规格选择（variants[]）（如有）
    - 数量选择器（+/- 按钮，min=1, max=stock）
    - "加入购物车"按钮
    - "立即购买"按钮（跳转确认订单页）
    - 商品描述（富文本）
    - 关联视频（如果有relatedVideoId）
    - 返回按钮
  - API调用：GET /api/products/:id
  - 加入购物车：POST /api/cart
- **涉及文件**:
  - `src/pages/user/product/detail.vue` (新建)
- **测试文件**: 手动测试
- **对应AC**: SHOP-002
- **依赖**: Task-22
- **验证标准**:
  - [ ] 图片轮播正常
  - [ ] 价格显示正确（原价划线）
  - [ ] 规格选择切换价格
  - [ ] 数量限制在库存范围内
  - [ ] 加购成功提示
  - [ ] 关联视频可点击跳转

---

#### Task-24: 开发购物车页面 (用户端)
- **通俗解释**: 做一个购物车页面，显示已添加的商品，可以改数量、删除、结算
- **说明**:
  - 新建 `src/pages/user/cart/index.vue`
  - UI组件：
    - 购物车商品列表（每个项显示：图片、名称、规格、单价、数量选择器、小计、删除按钮）
    - 底部结算栏（商品数量、总金额、"去结算"按钮）
    - 空购物车状态（图标+文字+"去逛逛"按钮）
    - 全选/反选（可选功能）
  - API调用：
    - onMounted: GET /api/cart
    - 修改数量: PUT /api/cart/item/:id
    - 删除: DELETE /api/cart/item/:id
  - 实时计算总金额
- **涉及文件**:
  - `src/pages/user/cart/index.vue` (新建)
  - `src/components/CartItem.vue` (新建 - 购物车项组件)
  - `src/api/cart.ts` (新建)
- **测试文件**: 手动测试
- **对应AC**: SHOP-003, SHOP-004
- **依赖**: Task-23
- **验证标准**:
  - [ ] 显示已添加商品及详情
  - [ ] 修改数量后总金额更新
  - [ ] 删除商品后列表刷新
  - [ ] 空购物车友好提示
  - [ ] 去结算跳转到确认订单页

---

#### Task-25: 开发确认订单页面 (用户端)
- **通俗解释**: 下单前的最后确认页面，选择地址、使用红包、提交订单
- **说明**:
  - 新建 `src/pages/user/order/create.vue`
  - UI组件：
    - 商品列表（只读，来自购物车）
    - 收货地址表单（姓名、电话、省市区、详细地址）
    - 红包选择（显示可用红包列表，选择后显示抵扣金额）
    - 金额明细（商品总额、运费、红包抵扣、应付金额）
    - 买家备注输入框
    - "提交订单"按钮
  - API调用：POST /api/orders
  - 提交成功后跳转到订单详情页（准备支付）
- **涉及文件**:
  - `src/pages/user/order/create.vue` (新建)
- **测试文件**: 手动测试
- **对应AC**: SHOP-005, SHOP-009, RP-006, RP-007
- **依赖**: Task-24
- **验证标准**:
  - [ ] 商品列表来自购物车参数
  - [ ] 地址表单必填校验
  - [ ] 红包选择后抵扣金额显示
  - [ ] 应付金额计算正确
  - [ ] 提交成功跳转支付页

---

#### Task-26: 开发订单列表页面 (用户端)
- **通俗解释**: 我的订单页面，用Tab切换查看不同状态的订单
- **说明**:
  - 新建 `src/pages/user/order/list.vue`
  - UI组件：
    - Tab导航（全部/待支付/已支付/发货中/已完成）
    - 订单卡片列表（订单号、商品缩略图、金额、状态标签、操作按钮）
    - 状态对应的操作：
      - 待支付：去支付 / 取消
      - 已支付：查看详情
      - 发货中：查看详情 / 确认收货
      - 已完成：评价（暂不支持）/ 再次购买
      - 已取消：删除记录
    - 空状态提示
  - API调用：GET /api/orders?status=xxx&page=
  - 下拉加载更多
- **涉及文件**:
  - `src/pages/user/order/list.vue` (新建)
  - `src/components/OrderCard.vue` (新建)
  - `src/api/order.ts` (新建)
- **测试文件**: 手动测试
- **对应AC**: SHOP-007
- **依赖**: Task-25
- **验证标准**:
  - [ ] Tab切换过滤正确
  - [ ] 订单卡片信息完整
  - [ ] 操作按钮按状态显示
  - [ ] 去支付调用支付API
  - [ ] 取消订单确认弹窗

---

#### Task-27: 开发订单详情页面 (用户端)
- **通俗解释**: 单个订单的详细信息页，显示完整信息和支持操作
- **说明**:
  - 新建 `src/pages/user/order/detail.vue`
  - UI组件：
    - 订单状态进度条（待支付→已支付→发货中→已送达→已完成）
    - 订单号、下单时间、支付方式、支付时间
    - 商品列表（图片、名称、规格、数量、单价、小计）
    - 金额明细（商品金额、运费、优惠、实付）
    - 收货地址（复制功能）
    - 物流信息（如有）
    - 操作区域（根据状态显示不同按钮）
  - API调用：GET /api/orders/:id
  - 支付按钮：POST /api/orders/:id/pay
- **涉及文件**:
  - `src/pages/user/order/detail.vue` (新建)
- **测试文件**: 手动测试
- **对应AC**: SHOP-006
- **依赖**: Task-26
- **验证标准**:
  - [ ] 订单完整信息展示
  - [ ] 状态进度条当前位置高亮
  - [ ] 支付按钮触发模拟支付
  - [ ] 支付成功后状态刷新
  - [ ] 取消/确认收货操作正常

---

#### Task-28: 开发商品管理页面 (管理员)
- **通俗解释**: 后台商品管理界面，支持上架下架、编辑商品信息
- **说明**:
  - 新建 `src/pages/admin/product/list.vue`
  - UI组件：
    - 顶部操作栏（"+ 新增商品"、搜索框、分类筛选）
    - 商品表格/列表（封面缩略图、名称、分类、价格、库存、状态、销量、操作）
    - 操作：编辑、上下架、删除
    - 分页
  - 新建 `src/pages/admin/product/edit.vue`:
    - 表单：名称、描述、分类、价格、原价、库存、上传图片、规格、标签、SEO
    - 预览功能
    - 保存/发布按钮
  - API调用：
    - GET/POST/PUT/DELETE /api/admin/products
    - PATCH /api/admin/products/:id/status
  - 图片上传：使用已有的upload能力
- **涉及文件**:
  - `src/pages/admin/product/list.vue` (新建)
  - `src/pages/admin/product/edit.vue` (新建)
- **测试文件**: 手动测试
- **对应AC**: SHOP-008
- **依赖**: Task-09
- **验证标准**:
  - [ ] 商品列表展示正确
  - [ ] 搜索和筛选生效
  - [ ] 新增商品表单验证
  - [ ] 编辑商品数据回填
  - [ ] 上下架状态切换
  - [ ] 删除确认弹窗

---

#### Task-29: 开发红包中心页面 (用户端)
- **通俗解释**: 用户查看和管理自己的红包（可用、已用、过期）
- **说明**:
  - 新建 `src/pages/user/red-packet/center.vue`
  - UI组件：
    - 三个Tab：可用(X元) | 已用(X元) | 已过期(X个)
    - 红包卡片：
      - 可用：红包名称、金额、有效期、来源（任务名）、"立即使用"按钮
      - 已用：红包名称、使用金额、使用时间、关联订单号
      - 过期：红包名称、金额、过期原因
    - 空状态提示
  - API调用：GET /api/my/red-packets?status=
- **涉及文件**:
  - `src/pages/user/red-packet/center.vue` (新建)
  - `src/components/RedPacketCard.vue` (新建)
  - `src/api/red-packet.ts` (新建)
- **测试文件**: 手动测试
- **对应AC**: RP-008
- **依赖**: Task-18
- **验证标准**:
  - [ ] 三个Tab分组正确
  - [ ] 可用红包显示金额和有效期
  - [ ] 已用红包显示使用记录
  - [ ] 过期红包显示过期原因
  - [ ] 空状态友好提示

---

#### Task-30: 增强视频播放器（显示关联商品）
- **通俗解释**: 在视频播放页面底部显示关联的商品卡片，引导用户购买
- **说明**:
  - 修改 `src/pages/user/video/player.vue`
  - 在视频控件下方添加：
    - "相关推荐"区块
    - 商品横向滚动卡片（如果videoInfo.productId存在）
    - 卡片内容：商品图、名称、价格、"查看详情"按钮
    - CTA按钮（如果videoInfo.ctaText存在）：醒目的行动号召按钮
  - 点击商品跳转 `/pages/user/product/detail?id=xxx`
  - 记录转化事件：POST /api/videos/:id/conversion {action: "click_cta"}
- **涉及文件**:
  - `src/pages/user/video/player.vue` (修改)
- **测试文件**: 手动测试
- **对应AC**: VIDEO-001, VIDEO-002, VIDEO-003
- **依赖**: Task-06, Task-20
- **验证标准**:
  - [ ] 有productId的视频显示商品卡片
  - [ ] 无productId的视频不显示此区域
  - [ ] 点击商品正确跳转
  - [ ] CTA按钮样式醒目
  - [ ] 转化事件被记录

---

### Phase 4: 测试与部署

#### Task-31: 端到端测试 - 管理员视角
- **通俗解释**: 模拟管理员完整操作流程，确保后台功能正常
- **说明**:
  - 测试场景：
    1. 登录admin账号 → 进入仪表盘 → 查看统计数据（非硬编码）
    2. 进入商品管理 → 创建商品 → 上传图片 → 发布
    3. 编辑商品 → 修改价格 → 上下架
    4. 进入订单管理 → 查看用户订单 → 手动填写快递单号
    5. 进入红包管理 → 创建任务型红包 → 设置规则 → 发放
    6. 查看数据统计 → 切换时间维度 → 验证数据准确性
  - 记录所有问题
- **涉及文件**: 测试脚本/手动测试
- **测试文件**: `tests/e2e/admin-flow.test.js` (新建)
- **对应AC**: STAT-001~008, SHOP-008, RP-001
- **依赖**: Task-21, Task-28, Task-29
- **验证标准**:
  - [ ] 管理员登录正常
  - [ ] 商品CRUD全流程正常
  - [ ] 订单列表可见
  - [ ] 红包创建和发放正常
  - [ ] 统计数据显示真实数据

---

#### Task-32: 端到端测试 - 用户视角
- **通俗解释**: 模拟普通用户完整购物流程，确保用户体验流畅
- **说明**:
  - 测试场景：
    1. 手机号登录 → 浏览商品列表 → 搜索"维生素"
    2. 点击商品 → 查看详情 → 选择规格 → 加入购物车
    3. 继续加购 → 进入购物车 → 修改数量 → 去结算
    4. 填写收货地址 → 选择可用红包 → 提交订单
    5. 模拟支付 → 查看订单详情 → 确认支付成功
    6. 浏览视频 → 观看完整视频 → 领取观看红包
    7. 进入红包中心 → 查看可用红包 → 下单时使用
    8. 查看订单列表 → 确认收货
  - 记录所有问题和UI体验问题
- **涉及文件**: 测试脚本/手动测试
- **测试文件**: `tests/e2e/user-flow.test.js` (新建)
- **对应AC**: SHOP-001~010, VIDEO-001~006, RP-002~010
- **依赖**: Task-22~30
- **验证标准**:
  - [ ] 商品浏览流畅
  - [ ] 购物车操作正常
  - [ ] 下单支付流程完整
  - [ ] 红包领取和使用正常
  - [ ] 视频营销转化正常
  - [ ] 订单状态流转正确

---

#### Task-33: Bug修复与优化
- **通俗解释**: 根据前两个Task发现的问题进行修复和性能优化
- **说明**:
  - 修复发现的Bug
  - 性能优化（慢查询添加索引、N+1查询优化）
  - UI/UX细节打磨
  - 错误提示友好化
  - 边界情况处理
- **涉及文件**: 视具体情况而定
- **测试文件**: 回归测试
- **对应AC**: 所有AC
- **依赖**: Task-31, Task-32
- **验证标准**:
  - [ ] 所有P0/P1 Bug修复
  - [ ] 页面加载时间<3秒
  - [ ] 无控制台报错
  - [ ] 空状态/错误状态友好提示

---

#### Task-34: 服务器部署与生产验证
- **通俗解释**: 将所有代码部署到云端服务器，验证线上环境正常运行
- **说明**:
  - 使用 deploy_server.py 部署后端代码
  - 使用 deploy_to_cloud.py 部署前端代码
  - PM2重启服务
  - Nginx配置更新（如有新的静态目录）
  - 生产环境验证：
    1. 访问 http://120.55.195.40:8080 (管理端)
    2. 访问 http://120.55.195.40:8081 (用户端)
    3. 登录功能测试
    4. 创建测试商品
    5. 模拟下单支付
    6. 验证数据统计页面
  - 记录部署日志和问题
- **涉及文件**:
  - `scripts/deploy_server.py` (可能需要更新)
  - `scripts/deploy_to_cloud.py` (可能需要更新)
- **测试文件**: 生产环境手动验证
- **对应AC**: 所有AC（生产环境验证）
- **依赖**: Task-33
- **验证标准**:
  - [ ] 后端PM2进程online
  - [ ] API健康检查通过
  - [ ] 前端页面可访问
  - [ ] 核心流程端到端通畅
  - [ ] 无明显性能问题

---

## 📊 任务依赖关系图

```
Phase 1 (基础架构):
Task-01(Product) ─┬─> Task-02(Cart)
                   ├─> Task-03(Order) ──> Task-04(Payment)
                   ├─> Task-06(Video扩展)
                   └─> Task-09(Product API)

Task-02(Cart) ──> Task-10(Cart API)

Task-03(Order) ──> Task-11(Order API基础) ──> Task-12(Order API支付)

Task-05(RedPacketRecord) ──> Task-13(RedPacket API)

Task-07(RedPacket扩展) ─┬─> Task-13(RedPacket API)
                        └─> Task-18(红包领取逻辑)

Task-08(Statistics API骨架)
Task-09(Product API)
Task-10(Cart API)
Task-11(Order API)
Task-12(Order API支付)
Task-13(RedPacket API)
  └──> Task-14(注册所有路由到server.js)

Phase 2 (核心逻辑):
Task-15(统计聚合) ──> Task-21(重构统计页面)
Task-16(购物车逻辑) ──> Task-24(购物车页面)
Task-17(订单完整流程) ──> Task-25(确认订单页)
Task-18(红包领取) ──> Task-29(红包中心)
Task-19(过期任务) ──> Task-29(红包中心)
Task-20(视频转化) ──> Task-30(播放器增强)

Phase 3 (前端页面):
Task-21(统计页面重构)
Task-22(商品列表) ──> Task-23(商品详情) ──> Task-24(购物车) ──> Task-25(确认订单) ──┬─> Task-26(订单列表) ──> Task-27(订单详情)
                                                                                     └─> Task-28(商品管理)
Task-29(红包中心)
Task-30(播放器增强)

Phase 4 (测试部署):
Task-31(管理员E2E)
Task-32(用户E2E)
Task-33(Bug修复)
Task-34(部署上线)
```

---

## ✅ 验收标准检查清单

### 数据统计模块 (STAT)
- [ ] STAT-001: 统计页面打开时从API加载真实数据
- [ ] STAT-002: 支持4种时间维度切换
- [ ] STAT-003: 显示环比增长率和趋势箭头
- [ ] STAT-004: 用户增长趋势图显示近7天数据
- [ ] STAT-005: 热门视频排行来自VideoWatch聚合
- [ ] STAT-006: 刷新按钮重新请求API
- [ ] STAT-007: 新增订单数和红包发放数指标
- [ ] STAT-008: 无数据时显示友好提示

### 视频营销模块 (VIDEO)
- [ ] VIDEO-001: 管理员可为视频关联商品
- [ ] VIDEO-002: 视频播放器底部显示商品卡片
- [ ] VIDEO-003: 记录视频转化事件
- [ ] VIDEO-004: 营销视频列表支持分类筛选
- [ ] VIDEO-005: 统计各视频转化率
- [ ] VIDEO-006: 转化漏斗数据可视化

### 产品销售模块 (SHOP)
- [ ] SHOP-001: 商品列表支持分页、分类、排序
- [ ] SHOP-002: 商品详情展示完整信息
- [ ] SHOP-003: 可添加商品到购物车
- [ ] SHOP-004: 购物车可修改数量和删除
- [ ] SHOP-005: 可创建订单
- [ ] SHOP-006: 模拟支付成功
- [ ] SHOP-007: 订单列表按状态Tab切换
- [ ] SHOP-008: 管理员可上下架商品
- [ ] SHOP-009: 订单金额计算正确
- [ ] SHOP-010: 库存不足时提示用户

### 红包模块 (REDPACKET)
- [ ] RP-001: 管理员可创建任务型红包
- [ ] RP-002: 用户完成任务后可领取
- [ ] RP-003: 同一用户不能重复领取
- [ ] RP-004: 红包金额随机（如果是random类型）
- [ ] RP-005: 红包有过期时间
- [ ] RP-006: 下单时可使用红包抵扣
- [ ] RP-007: 红包满足最低消费金额才能用
- [ ] RP-008: 红包中心显示三个Tab
- [ ] RP-009: 红包活动有时间窗口
- [ ] RP-010: 红包统计准确

---

## 📝 备注

1. **开发顺序**: 必须严格按Task编号顺序执行，因为存在依赖关系
2. **TDD驱动**: 每个Task都应遵循 Red-Green-Refactor 循环
3. **代码提交**: 每完成一个Task立即git commit
4. **文档同步**: 代码变更影响到设计文档时及时更新
5. **测试策略**: 单元测试 + 集成测试 + E2E测试三层保障
6. **性能关注**: 特别注意统计查询的性能优化（可能需要预聚合表）

---

**文档状态**: 待执行  
**最后更新**: 2026-04-10  
**负责人**: AI Assistant
