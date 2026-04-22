interface UserBehavior {
  userId: string;
  itemId: string;
  itemType: 'video' | 'course' | 'product';
  action: 'view' | 'like' | 'cart' | 'purchase' | 'complete' | 'share';
  timestamp: number;
  value?: number;
}

interface ItemFeature {
  itemId: string;
  itemType: string;
  category: string[];
  tags: string[];
  price?: number;
  rating?: number;
  popularity: number;
  metadata: Record<string, any>;
}

interface UserProfile {
  userId: string;
  preferences: Record<string, number>;
  demographics: {
    ageGroup?: string;
    location?: string;
    memberLevel?: string;
  };
  context: {
    lastVisitCategory?: string;
    timeOfDay?: string;
    deviceType?: string;
  };
}

interface RecommendationResult {
  itemId: string;
  itemType: string;
  score: number;
  confidence: number;
  reasons: string[];
  metadata: {
    algorithm: string;
    factors: Array<{ name: string; weight: number; contribution: number }>;
  };
}

interface MatrixFactorizationConfig {
  latentFactors: number;
  learningRate: number;
  regularization: number;
  iterations: number;
}

class AdvancedRecommendationEngine {
  private userItemMatrix: Map<string, Map<string, number>> = new Map();
  private itemFeatures: Map<string, ItemFeature> = new Map();
  private userProfiles: Map<string, UserProfile> = new Map();
  private behaviors: UserBehavior[] = [];
  private userLatentFactors: Map<string, number[]> = new Map();
  private itemLatentFactors: Map<string, number[]> = new Map();
  private similarityCache: Map<string, Map<string, number>> = new Map();
  private config: MatrixFactorizationConfig;

  constructor(config?: Partial<MatrixFactorizationConfig>) {
    this.config = {
      latentFactors: 20,
      learningRate: 0.01,
      regularization: 0.02,
      iterations: 100,
      ...config
    };
  }

  addBehavior(behavior: UserBehavior): void {
    this.behaviors.push(behavior);
    this.updateUserItemMatrix(behavior);

    if (this.behaviors.length % 100 === 0) {
      this.incrementalUpdate();
    }
  }

  addBehaviors(behaviors: UserBehavior[]): void {
    behaviors.forEach(b => this.addBehavior(b));
  }

  addItemFeature(feature: ItemFeature): void {
    this.itemFeatures.set(feature.itemId, feature);
  }

  setUserProfile(profile: UserProfile): void {
    this.userProfiles.set(profile.userId, profile);
  }

  getRecommendations(
    userId: string,
    options: {
      type?: 'video' | 'course' | 'product';
      count?: number;
      excludeInteracted?: boolean;
      diversityBoost?: number;
      freshnessWeight?: number;
    } = {}
  ): RecommendationResult[] {
    const {
      type,
      count = 10,
      excludeInteracted = true,
      diversityBoost = 0.3,
      freshnessWeight = 0.2
    } = options;

    const candidateItems = this.getCandidateItems(userId, type, excludeInteracted);
    const scoredItems: RecommendationResult[] = [];

    for (const itemId of candidateItems) {
      const result = this.calculateRecommendationScore(userId, itemId, diversityBoost, freshnessWeight);
      if (result.score > 0) {
        scoredItems.push(result);
      }
    }

    scoredItems.sort((a, b) => b.score - a.score);

    return this.applyDiversityFilter(scoredItems.slice(0, count * 2), count, diversityBoost);
  }

  getAlsoBought(productId: string, count: number = 5): RecommendationResult[] {
    const coPurchaseScores = new Map<string, number>();

    const productUsers = this.getUsersWhoInteractedWith(productId, 'purchase');
    for (const userId of productUsers) {
      const userItems = this.getUserInteractions(userId, 'purchase');
      for (const [itemId, rating] of userItems) {
        if (itemId !== productId) {
          const currentScore = coPurchaseScores.get(itemId) || 0;
          coPurchaseScores.set(itemId, currentScore + rating);
        }
      }
    }

    const results: RecommendationResult[] = [];
    for (const [itemId, score] of coPurchaseScores) {
      const feature = this.itemFeatures.get(itemId);
      if (feature && feature.itemType === 'product') {
        results.push({
          itemId,
          itemType: feature.itemType,
          score: score / productUsers.length,
          confidence: Math.min(1, score / (productUsers.length * 3)),
          reasons: [`与 ${productId} 一起被购买 ${score} 次`],
          metadata: {
            algorithm: 'co-purchase',
            factors: [{ name: '协同过滤', weight: 1, contribution: score }]
          }
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, count);
  }

  getPopularItems(
    type: 'video' | 'course' | 'product',
    period: 'day' | 'week' | 'month' = 'week',
    count: number = 10
  ): Array<{ itemId: string; popularity: number; trend: 'up' | 'down' | 'stable' }> {
    const now = Date.now();
    const periodMs = period === 'day' ? 86400000 :
                     period === 'week' ? 604800000 :
                     2592000000;

    const itemScores = new Map<string, { current: number; previous: number }>();

    const relevantBehaviors = this.behaviors.filter(b =>
      b.itemType === type &&
      now - b.timestamp < periodMs * 2
    );

    for (const behavior of relevantBehaviors) {
      if (!itemScores.has(behavior.itemId)) {
        itemScores.set(behavior.itemId, { current: 0, previous: 0 });
      }

      const scores = itemScores.get(behavior.itemId)!;
      if (now - behavior.timestamp < periodMs) {
        scores.current += this.getActionWeight(behavior.action);
      } else {
        scores.previous += this.getActionWeight(behavior.action);
      }
    }

    const results: Array<{ itemId: string; popularity: number; trend: 'up' | 'down' | 'stable' }> = [];

    for (const [itemId, scores] of itemScores) {
      const change = scores.previous > 0 ?
        (scores.current - scores.previous) / scores.previous : 0;

      results.push({
        itemId,
        popularity: scores.current,
        trend: change > 0.1 ? 'up' : change < -0.1 ? 'down' : 'stable'
      });
    }

    results.sort((a, b) => b.popularity - a.popularity);
    return results.slice(0, count);
  }

  trainModel(): { rmse: number; iterations: number; converged: boolean } {
    console.log('[Recommendation] Starting matrix factorization training...');

    this.initializeMatrices();

    let prevRmse = Infinity;
    let converged = false;
    let rmse = 0;

    for (let iter = 0; iter < this.config.iterations; iter++) {
      const { error, updates } = this.performSGDIteration();

      rmse = Math.sqrt(error / this.behaviors.length);

      if (iter % 10 === 0) {
        console.log(`[Recommendation] Iteration ${iter}: RMSE = ${rmse.toFixed(6)}`);
      }

      if (Math.abs(prevRmse - rmse) < 0.00001) {
        converged = true;
        console.log(`[Recommendation] Converged at iteration ${iter}`);
        break;
      }

      prevRmse = rmse;
      this.applyUpdates(updates);
    }

    this.buildSimilarityCache();

    console.log(`[Recommendation] Training complete. Final RMSE: ${rmse.toFixed(6)}`);
    return { rmse, iterations: converged ? this.config.iterations : this.config.iterations, converged };
  }

  private calculateRecommendationScore(
    userId: string,
    itemId: string,
    diversityBoost: number,
    freshnessWeight: number
  ): RecommendationResult {
    const factors: Array<{ name: string; weight: number; contribution: number }> = [];
    let totalScore = 0;

    const collaborativeScore = this.getCollaborativeScore(userId, itemId);
    factors.push({ name: '协同过滤', weight: 0.35, contribution: collaborativeScore });
    totalScore += collaborativeScore * 0.35;

    const contentScore = this.getContentBasedScore(userId, itemId);
    factors.push({ name: '内容相似', weight: 0.25, contribution: contentScore });
    totalScore += contentScore * 0.25;

    const mfScore = this.getMatrixFactorizationScore(userId, itemId);
    factors.push({ name: '矩阵分解', weight: 0.25, contribution: mfScore });
    totalScore += mfScore * 0.25;

    const contextualScore = this.getContextualScore(userId, itemId);
    factors.push({ name: '上下文感知', weight: 0.15, contribution: contextualScore });
    totalScore += contextualScore * 0.15;

    const feature = this.itemFeatures.get(itemId);
    const freshnessBonus = this.calculateFreshnessBonus(itemId, freshnessWeight);
    totalScore += freshnessBonus;

    const confidence = this.calculateConfidence(userId, itemId, totalScore);
    const reasons = this.generateReasons(userId, itemId, factors, feature);

    return {
      itemId,
      itemType: feature?.itemType || 'unknown',
      score: Math.round(totalScore * 10000) / 10000,
      confidence: Math.round(confidence * 10000) / 10000,
      reasons,
      metadata: {
        algorithm: 'hybrid_mf',
        factors: factors.sort((a, b) => b.contribution - a.contribution)
      }
    };
  }

  private getCollaborativeScore(userId: string, itemId: string): number {
    const similarUsers = this.findSimilarUsers(userId, 5);
    let weightedSum = 0;
    let similaritySum = 0;

    for (const [simUserId, similarity] of similarUsers) {
      const userRating = this.getUserItemRating(simUserId, itemId);
      if (userRating > 0) {
        weightedSum += similarity * userRating;
        similaritySum += Math.abs(similarity);
      }
    }

    return similaritySum > 0 ? weightedSum / similaritySum : 0;
  }

  private getContentBasedScore(userId: string, itemId: string): number {
    const userProfile = this.userProfiles.get(userId);
    const itemFeature = this.itemFeatures.get(itemId);

    if (!userProfile || !itemFeature) return 0;

    let score = 0;
    let matchCount = 0;

    for (const [category, preference] of Object.entries(userProfile.preferences)) {
      if (itemFeature.category.includes(category) || itemFeature.tags.includes(category)) {
        score += preference;
        matchCount++;
      }
    }

    return matchCount > 0 ? score / matchCount : 0;
  }

  private getMatrixFactorizationScore(userId: string, itemId: string): number {
    const userFactors = this.userLatentFactors.get(userId);
    const itemFactors = this.itemLatentFactors.get(itemId);

    if (!userFactors || !itemFactors) return 0;

    let dotProduct = 0;
    for (let i = 0; i < this.config.latentFactors; i++) {
      dotProduct += userFactors[i] * itemFactors[i];
    }

    return Math.max(0, Math.min(5, dotProduct));
  }

  private getContextualScore(userId: string, itemId: string): number {
    const userProfile = this.userProfiles.get(userId);
    const itemFeature = this.itemFeatures.get(itemId);

    if (!userProfile || !itemFeature) return 0;

    let score = 1;

    if (userProfile.context.lastVisitCategory &&
        itemFeature.category.includes(userProfile.context.lastVisitCategory)) {
      score *= 1.5;
    }

    const hour = new Date().getHours();
    if (userProfile.context.timeOfDay === 'morning' && hour >= 6 && hour < 12) {
      score *= 1.2;
    } else if (userProfile.context.timeOfDay === 'evening' && hour >= 18 && hour < 24) {
      score *= 1.3;
    }

    if (userProfile.demographics.memberLevel === 'premium') {
      score *= 1.1;
    }

    return score;
  }

  private calculateFreshnessBonus(itemId: string, weight: number): number {
    const recentBehaviors = this.behaviors.filter(
      b => b.itemId === itemId && Date.now() - b.timestamp < 7 * 86400000
    );

    if (recentBehaviors.length > 10) {
      return weight * 0.5;
    } else if (recentBehaviors.length > 5) {
      return weight * 0.3;
    }
    return 0;
  }

  private calculateConfidence(userId: string, itemId: string, score: number): number {
    const userInteractions = this.getUserInteractions(userId).size;
    const itemInteractions = this.getItemInteractions(itemId).size;

    const dataConfidence = Math.min(1, (userInteractions + itemInteractions) / 50);
    const scoreConfidence = Math.min(1, score / 3);

    return (dataConfidence * 0.6 + scoreConfidence * 0.4);
  }

  private generateReasons(
    userId: string,
    itemId: string,
    factors: Array<{ name: string; weight: number; contribution: number }>,
    feature?: ItemFeature
  ): string[] {
    const reasons: string[] = [];
    const topFactors = factors.filter(f => f.contribution > 0.1).slice(0, 3);

    topFactors.forEach(factor => {
      switch (factor.name) {
        case '协同过滤':
          reasons.push('与您兴趣相似的用户也喜欢');
          break;
        case '内容相似':
          reasons.push('符合您的内容偏好');
          break;
        case '矩阵分解':
          reasons.push('基于您的行为模式匹配');
          break;
        case '上下文感知':
          reasons.push('适合当前的浏览场景');
          break;
      }
    });

    if (feature && feature.popularity > 7) {
      reasons.push('热门商品');
    }

    return reasons;
  }

  private initializeMatrices(): void {
    const allUsers = new Set<string>();
    const allItems = new Set<string>();

    for (const behavior of this.behaviors) {
      allUsers.add(behavior.userId);
      allItems.add(behavior.itemId);
    }

    const factorInit = 1 / Math.sqrt(this.config.latentFactors);

    for (const userId of allUsers) {
      if (!this.userLatentFactors.has(userId)) {
        this.userLatentFactors.set(userId,
          Array.from({ length: this.config.latentFactors }, () => (Math.random() - 0.5) * factorInit)
        );
      }
    }

    for (const itemId of allItems) {
      if (!this.itemLatentFactors.has(itemId)) {
        this.itemLatentFactors.set(itemId,
          Array.from({ length: this.config.latentFactors }, () => (Math.random() - 0.5) * factorInit)
        );
      }
    }
  }

  private performSGDIteration(): { error: number; updates: Map<string, number[]> } {
    let totalError = 0;
    const updates = new Map<string, number[]>();

    for (const behavior of this.behaviors) {
      const userFactors = this.userLatentFactors.get(behavior.userId);
      const itemFactors = this.itemLatentFactors.get(behavior.itemId);

      if (!userFactors || !itemFactors) continue;

      let prediction = 0;
      for (let i = 0; i < this.config.latentFactors; i++) {
        prediction += userFactors[i] * itemFactors[i];
      }

      const actual = this.getActionWeight(behavior.action);
      const error = actual - prediction;
      totalError += error * error;

      for (let i = 0; i < this.config.latentFactors; i++) {
        const userGrad = error * itemFactors[i] - this.config.regularization * userFactors[i];
        const itemGrad = error * userFactors[i] - this.config.regularization * itemFactors[i];

        userFactors[i] += this.config.learningRate * userGrad;
        itemFactors[i] += this.config.learningRate * itemGrad;
      }

      updates.set(`user_${behavior.userId}`, [...userFactors]);
      updates.set(`item_${behavior.itemId}`, [...itemFactors]);
    }

    return { error: totalError, updates };
  }

  private applyUpdates(updates: Map<string, number[]>): void {
    for (const [key, factors] of updates) {
      if (key.startsWith('user_')) {
        this.userLatentFactors.set(key.substring(5), factors);
      } else if (key.startsWith('item_')) {
        this.itemLatentFactors.set(key.substring(5), factors);
      }
    }
  }

  private buildSimilarityCache(): void {
    this.similarityCache.clear();

    const items = Array.from(this.itemLatentFactors.keys());
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const sim = this.cosineSimilarity(
          this.itemLatentFactors.get(items[i])!,
          this.itemLatentFactors.get(items[j])!
        );

        if (!this.similarityCache.has(items[i])) {
          this.similarityCache.set(items[i], new Map());
        }
        if (!this.similarityCache.has(items[j])) {
          this.similarityCache.set(items[j], new Map());
        }

        this.similarityCache.get(items[i])!.set(items[j], sim);
        this.similarityCache.get(items[j])!.set(items[i], sim);
      }
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  private findSimilarUsers(userId: string, k: number): Array<[string, number]> {
    const targetUserInteractions = this.getUserInteractions(userId);
    const similarities: Array<[string, number]> = [];

    for (const [otherUserId, interactions] of this.userItemMatrix) {
      if (otherUserId === userId) continue;

      const similarity = this.jaccardSimilarity(targetUserInteractions, interactions);
      if (similarity > 0) {
        similarities.push([otherUserId, similarity]);
      }
    }

    similarities.sort((a, b) => b[1] - a[1]);
    return similarities.slice(0, k);
  }

  private jaccardSimilarity(setA: Map<string, number>, setB: Map<string, number>): number {
    const intersection = new Set([...setA.keys()].filter(x => setB.has(x)));
    const union = new Set([...setA.keys(), ...setB.keys()]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private getCandidateItems(
    userId: string,
    type?: 'video' | 'course' | 'product',
    excludeInteracted: boolean = true
  ): string[] {
    const candidates: Set<string> = new Set();
    const interactedItems = excludeInteracted ? new Set(this.getUserInteractions(userId).keys()) : new Set();

    for (const [itemId, feature] of this.itemFeatures) {
      if ((!type || feature.itemType === type) && !interactedItems.has(itemId)) {
        candidates.add(itemId);
      }
    }

    return Array.from(candidates);
  }

  private applyDiversityFilter(
    items: RecommendationResult[],
    targetCount: number,
    diversityBoost: number
  ): RecommendationResult[] {
    if (items.length <= targetCount) return items;

    const selected: RecommendationResult[] = [];
    const selectedCategories = new Set<string>();

    for (const item of items) {
      if (selected.length >= targetCount) break;

      const feature = this.itemFeatures.get(item.itemId);
      const category = feature?.category[0] || 'other';

      const categoryCount = Array.from(selectedCategories).filter(c => c === category).length;
      const maxCategoryRatio = 0.4;

      if (categoryCount < targetCount * maxCategoryRatio ||
          !selectedCategories.has(category) ||
          item.score > 3) {
        selected.push(item);
        selectedCategories.add(category);
      }
    }

    while (selected.length < targetCount && items[selected.length]) {
      selected.push(items[selected.length]);
    }

    return selected;
  }

  private updateUserItemMatrix(behavior: UserBehavior): void {
    if (!this.userItemMatrix.has(behavior.userId)) {
      this.userItemMatrix.set(behavior.userId, new Map());
    }

    const userItems = this.userItemMatrix.get(behavior.userId)!;
    const currentRating = userItems.get(behavior.itemId) || 0;
    const actionWeight = this.getActionWeight(behavior.action);

    userItems.set(behavior.itemId, Math.max(currentRating, actionWeight));
  }

  private getUserInteractions(userId: string, action?: string): Map<string, number> {
    const interactions = this.userItemMatrix.get(userId) || new Map();

    if (action) {
      const filtered = new Map<string, number>();
      for (const behavior of this.behaviors) {
        if (behavior.userId === userId && behavior.action === action) {
          const current = filtered.get(behavior.itemId) || 0;
          filtered.set(behavior.itemId, Math.max(current, this.getActionWeight(behavior.action)));
        }
      }
      return filtered;
    }

    return interactions;
  }

  private getItemInteractions(itemId: string): Map<string, number> {
    const interactions = new Map<string, number>();
    for (const behavior of this.behaviors) {
      if (behavior.itemId === itemId) {
        const current = interactions.get(behavior.userId) || 0;
        interactions.set(behavior.userId, Math.max(current, this.getActionWeight(behavior.action)));
      }
    }
    return interactions;
  }

  private getUsersWhoInteractedWith(itemId: string, action: string): string[] {
    const users = new Set<string>();
    for (const behavior of this.behaviors) {
      if (behavior.itemId === itemId && behavior.action === action) {
        users.add(behavior.userId);
      }
    }
    return Array.from(users);
  }

  private getUserItemRating(userId: string, itemId: string): number {
    return this.userItemMatrix.get(userId)?.get(itemId) || 0;
  }

  private getActionWeight(action: string): number {
    const weights: Record<string, number> = {
      view: 1,
      like: 2,
      cart: 3,
      purchase: 5,
      complete: 4,
      share: 3
    };
    return weights[action] || 1;
  }

  private incrementalUpdate(): void {
    const recentBehaviors = this.behaviors.slice(-100);
    for (const behavior of recentBehaviors) {
      const userFactors = this.userLatentFactors.get(behavior.userId);
      const itemFactors = this.itemLatentFactors.get(behavior.itemId);

      if (userFactors && itemFactors) {
        const actual = this.getActionWeight(behavior.action);
        let prediction = 0;
        for (let i = 0; i < this.config.latentFactors; i++) {
          prediction += userFactors[i] * itemFactors[i];
        }

        const error = actual - prediction;
        const learningRate = this.config.learningRate * 0.5;

        for (let i = 0; i < this.config.latentFactors; i++) {
          userFactors[i] += learningRate * (error * itemFactors[i] - this.config.regularization * userFactors[i]);
          itemFactors[i] += learningRate * (error * userFactors[i] - this.config.regularization * itemFactors[i]);
        }
      }
    }
  }

  getStatistics(): {
    totalUsers: number;
    totalItems: number;
    totalBehaviors: number;
    modelTrained: boolean;
    latentFactors: number;
    cacheSize: number;
  } {
    return {
      totalUsers: this.userItemMatrix.size,
      totalItems: this.itemFeatures.size,
      totalBehaviors: this.behaviors.length,
      modelTrained: this.userLatentFactors.size > 0,
      latentFactors: this.config.latentFactors,
      cacheSize: this.similarityCache.size
    };
  }

  exportModel(): object {
    return {
      config: this.config,
      userFactors: Object.fromEntries(this.userLatentFactors),
      itemFactors: Object.fromEntries(this.itemLatentFactors),
      statistics: this.getStatistics()
    };
  }
}

export const advancedRecommendationEngine = new AdvancedRecommendationEngine();

export type {
  UserBehavior,
  ItemFeature,
  UserProfile,
  RecommendationResult,
  MatrixFactorizationConfig
};
