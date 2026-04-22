/**
 * 智能推荐引擎 (基础版)
 * 基于用户行为数据的商品/视频推荐
 */

interface UserBehavior {
  userId: string
  itemId: string
  itemType: 'video' | 'course' | 'product'
  action: 'view' | 'like' | 'cart' | 'purchase' | 'complete'
  timestamp: number
  duration?: number
}

interface RecommendationResult {
  itemId: string
  score: number
  reason: string
  metadata?: any
}

class RecommendationEngine {
  private behaviors: Map<string, UserBehavior[]> = new Map()
  private itemSimilarity: Map<string, Map<string, number>> = new Map()

  /**
   * 记录用户行为
   */
  recordBehavior(behavior: UserBehavior): void {
    const userBehaviors = this.behaviors.get(behavior.userId) || []
    userBehaviors.push(behavior)
    this.behaviors.set(behavior.userId, userBehaviors)

    // 实时更新相似度矩阵（简化版）
    if (behavior.action === 'purchase') {
      this.updateItemSimilarity(behavior.itemId, behavior.itemType)
    }
  }

  /**
   * 批量导入行为数据
   */
  importBehaviors(behaviors: UserBehavior[]): void {
    behaviors.forEach(b => this.recordBehavior(b))
  }

  /**
   * 获取个性化推荐
   */
  getRecommendations(
    userId: string,
    options: {
      type?: 'video' | 'course' | 'product'
      limit?: number
      excludeIds?: string[]
      context?: string // 当前浏览的上下文（如正在看的视频ID）
    } = {}
  ): RecommendationResult[] {
    const {
      type = 'product',
      limit = 10,
      excludeIds = [],
      context
    } = options

    const userBehaviors = this.behaviors.get(userId) || []
    const scores: Map<string, { total: number; reasons: string[] }> = new Map()

    // 策略1: 基于历史购买的协同过滤
    const purchasedItems = userBehaviors
      .filter(b => b.action === 'purchase')
      .map(b => b.itemId)

    purchasedItems.forEach(purchasedId => {
      const similarItems = this.itemSimilarity.get(purchasedId) || new Map()
      similarItems.forEach((score, similarId) => {
        if (!excludeIds.includes(similarId) && similarId !== purchasedId) {
          const current = scores.get(similarId) || { total: 0, reasons: [] }
          current.total += score * 0.6 // 协同过滤权重
          current.reasons.push(`购买过相似商品的${Math.round(score * 100)}%的用户也喜欢`)
          scores.set(similarId, current)
        }
      })
    })

    // 策略2: 基于内容关联（视频→商品）
    const viewedVideos = userBehaviors
      .filter(b => b.itemType === 'video' && b.action === 'view')
      .map(b => b.itemId)

    viewedVideos.forEach(videoId => {
      // 假设视频有productId或productIds属性
      const relatedProducts = this.getVideoRelatedProducts(videoId)
      relatedProducts.forEach(({ productId, confidence }) => {
        if (!excludeIds.includes(productId)) {
          const current = scores.get(productId) || { total: 0, reasons: [] }
          current.total += confidence * 0.4 // 内容关联权重
          current.reasons.push(`您观看的视频"${videoId}"相关`)
          scores.set(productId, current)
        }
      })
    })

    // 策略3: 基于上下文的即时推荐
    if (context) {
      const contextRelated = this.getContextualRecommendations(context)
      contextRelated.forEach(({ itemId, score, reason }) => {
        if (!excludeIds.includes(itemId)) {
          const current = scores.get(itemId) || { total: 0, reasons: [] }
          current.total += score * 0.8 // 上下文权重更高
          current.reasons.unshift(reason) // 上下文原因优先显示
          scores.set(itemId, current)
        }
      })
    })

    // 排序并返回Top N
    return Array.from(scores.entries())
      .map(([itemId, data]) => ({
        itemId,
        score: Math.round(data.total * 100) / 100,
        reason: data.reasons[0] || '基于您的兴趣推荐',
        metadata: { allReasons: data.reasons }
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  /**
   * 获取"猜你喜欢"列表（用于首页展示）
   */
  getYouMayLike(
    userId: string,
    count: number = 6
  ): RecommendationResult[] {
    return this.getRecommendations(userId, {
      type: 'product',
      limit: count,
      context: undefined
    })
  }

  /**
   * 获取"购买此商品的人还买了"列表
   */
  getAlsoBought(productId: string, count: number = 4): RecommendationResult[] {
    const similarItems = this.itemSimilarity.get(productId) || new Map()

    return Array.from(similarItems.entries())
      .map(([itemId, score]) => ({
        itemId,
        score: Math.round(score * 100) / 100,
        reason: `购买了此商品的用户中有${Math.round(score * 100)}%也购买了该商品`
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
  }

  /**
   * 获取热门推荐（冷启动用）
   */
  getPopularRecommendations(
    type: 'video' | 'course' | 'product',
    period: 'day' | 'week' | 'month' = 'week',
    count: number = 10
  ): Array<{ itemId: string; popularity: number }> {
    const now = Date.now()
    const periodMs = period === 'day' ? 86400000 : period === 'week' ? 604800000 : 2592000000

    const itemStats: Map<string, { views: number; purchases: number }> = new Map()

    this.behaviors.forEach((behaviors) => {
      behaviors.forEach(b => {
        if (b.itemType === type && (now - b.timestamp) < periodMs) {
          const stats = itemStats.get(b.itemId) || { views: 0, purchases: 0 }
          if (b.action === 'view') stats.views++
          if (b.action === 'purchase') stats.purchases++
          itemStats.set(b.itemId, stats)
        }
      })
    })

    return Array.from(itemStats.entries())
      .map(([itemId, stats]) => ({
        itemId,
        popularity: stats.purchases * 3 + stats.views // 购买权重更高
      }))
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, count)
  }

  /**
   * 更新物品相似度矩阵（简化版：基于共同购买）
   */
  private updateItemSimilarity(itemId: string, _itemType: string): void {
    // 找到所有购买过该商品的用户
    const usersWhoPurchased: string[] = []
    this.behaviors.forEach((behaviors, userId) => {
      const hasPurchased = behaviors.some(
        b => b.itemId === itemId && b.action === 'purchase'
      )
      if (hasPurchased) usersWhoPurchased.push(userId)
    })

    // 统计这些用户还购买了哪些其他商品
    const coPurchaseCount: Map<string, number> = new Map()
    usersWhoPurchased.forEach(userId => {
      const behaviors = this.behaviors.get(userId) || []
      behaviors.forEach(b => {
        if (
          b.action === 'purchase' &&
          b.itemId !== itemId &&
          b.itemType === 'product' // 只统计商品间的相似度
        ) {
          coPurchaseCount.set(
            b.itemId,
            (coPurchaseCount.get(b.itemId) || 0) + 1
          )
        }
      })
    })

    // 计算Jaccard相似度并更新矩阵
    const totalUsers = usersWhoPurchased.length
    coPurchaseCount.forEach((count, otherItemId) => {
      const similarity = count / totalUsers

      let similarityMap = this.itemSimilarity.get(itemId)
      if (!similarityMap) {
        similarityMap = new Map()
        this.itemSimilarity.set(itemId, similarityMap)
      }
      similarityMap.set(otherItemId, similarity)

      // 双向更新
      let reverseMap = this.itemSimilarity.get(otherItemId)
      if (!reverseMap) {
        reverseMap = new Map()
        this.itemSimilarity.set(otherItemId, reverseMap)
      }
      reverseMap.set(itemId, similarity)
    })
  }

  /**
   * 获取视频关联的商品（模拟数据，实际应从API获取）
   */
  private getVideoRelatedProducts(videoId: string): Array<{ productId: string; confidence: number }> {
    // 这里应该是从后端获取视频的productId/productIds字段
    // 当前返回模拟数据用于演示
    return [
      { productId: 'prod_001', confidence: 0.9 },
      { productId: 'prod_002', confidence: 0.7 },
      { productId: 'prod_003', confidence: 0.5 }
    ]
  }

  /**
   * 获取上下文相关的推荐
   */
  private getContextualRecommendations(contextId: string): Array<{ itemId: string; score: number; reason: string }> {
    // 基于当前上下文（如正在查看的商品）返回相关推荐
    // 实际实现应该查询数据库中的关联关系
    return [
      { itemId: 'context_rec_1', score: 0.85, reason: '与当前内容高度相关' },
      { itemId: 'context_rec_2', score: 0.72, reason: '同类商品中的热销款' }
    ]
  }

  /**
   * 清理过期数据
   */
  cleanup(retentionDays: number = 90): void {
    const cutoff = Date.now() - retentionDays * 86400000

    this.behaviors.forEach((behaviors, userId) => {
      const filtered = behaviors.filter(b => b.timestamp > cutoff)
      if (filtered.length === 0) {
        this.behaviors.delete(userId)
      } else {
        this.behaviors.set(userId, filtered)
      }
    })
  }

  /**
   * 导出统计数据
   */
  getStats(): {
    totalUsers: number
    totalBehaviors: number
    itemSimilarityEntries: number
  } {
    let totalBehaviors = 0
    let similarityEntries = 0

    this.behaviors.forEach(b => (totalBehaviors += b.length))
    this.itemSimilarity.forEach(m => (similarityEntries += m.size))

    return {
      totalUsers: this.behaviors.size,
      totalBehaviors,
      itemSimilarityEntries: similarityEntries
    }
  }
}

// 导出全局单例
export const recommendationEngine = new RecommendationEngine()

// 导出便捷方法
export function getPersonalizedRecommendations(
  userId: string,
  options?: Parameters<RecommendationEngine['getRecommendations']>[1]
) {
  return recommendationEngine.getRecommendations(userId, options)
}

export function getPopularItems(
  type: 'video' | 'course' | 'product',
  count?: number
) {
  return recommendationEngine.getPopularRecommendations(type, 'week', count)
}
