interface Variant {
  id: string;
  name: string;
  weight: number;
  config: Record<string, any>;
}

interface Experiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: Variant[];
  startDate?: number;
  endDate?: number;
  targetMetric: string;
  trafficAllocation: number;
  createdAt: number;
  updatedAt: number;
}

interface ExperimentEvent {
  experimentId: string;
  variantId: string;
  userId: string;
  eventType: 'exposure' | 'conversion' | 'custom';
  eventName?: string;
  value?: number;
  timestamp: number;
}

interface ExperimentResult {
  experimentId: string;
  variantId: string;
  name: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  confidenceInterval: [number, number];
  isWinner: boolean;
  improvement: number;
  pValue: number;
  significant: boolean;
}

class ABTestEngine {
  private experiments: Map<string, Experiment> = new Map();
  private events: ExperimentEvent[] = [];
  private userAssignments: Map<string, Map<string, string>> = new Map();
  private listeners: Map<string, Function[]> = new Map();

  createExperiment(config: Partial<Experiment> & { id: string; name: string; variants: Omit<Variant, 'id'>[] }): Experiment {
    const totalWeight = config.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.001) {
      throw new Error(`变体权重总和必须为100，当前为${totalWeight}`);
    }

    const variants: Variant[] = config.variants.map((v, index) => ({
      ...v,
      id: v.id || `variant_${index}`
    }));

    const experiment: Experiment = {
      status: 'draft',
      trafficAllocation: 100,
      targetMetric: 'conversion_rate',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...config,
      variants
    };

    this.experiments.set(experiment.id, experiment);
    this.emit('experimentCreated', experiment);
    return experiment;
  }

  getExperiment(experimentId: string): Experiment | undefined {
    return this.experiments.get(experimentId);
  }

  getAllExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  getActiveExperiments(): Experiment[] {
    return this.getAllExperiments().filter(exp => exp.status === 'running');
  }

  updateExperiment(experimentId: string, updates: Partial<Experiment>): Experiment | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    Object.assign(experiment, updates, { updatedAt: Date.now() });
    this.emit('experimentUpdated', experiment);
    return experiment;
  }

  deleteExperiment(experimentId: string): boolean {
    const deleted = this.experiments.delete(experimentId);
    if (deleted) {
      this.emit('experimentDeleted', experimentId);
    }
    return deleted;
  }

  startExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'draft') return false;

    experiment.status = 'running';
    experiment.startDate = Date.now();
    experiment.updatedAt = Date.now();
    this.emit('experimentStarted', experiment);
    return true;
  }

  pauseExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || !['running', 'paused'].includes(experiment.status)) return false;

    experiment.status = experiment.status === 'running' ? 'paused' : 'running';
    experiment.updatedAt = Date.now();
    this.emit('experimentStatusChanged', experiment);
    return true;
  }

  completeExperiment(experimentId: string, winnerVariantId?: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || !['running', 'paused'].includes(experiment.status)) return false;

    experiment.status = 'completed';
    experiment.endDate = Date.now();
    experiment.updatedAt = Date.now();

    if (winnerVariantId) {
      experiment.variants.forEach(v => {
        v.config.isWinner = v.id === winnerVariantId;
      });
    }

    this.emit('experimentCompleted', experiment);
    return true;
  }

  assignVariant(experimentId: string, userId: string): Variant | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') return null;

    if (!this.userAssignments.has(userId)) {
      this.userAssignments.set(userId, new Map());
    }

    const userExps = this.userAssignments.get(userId)!;
    if (userExps.has(experimentId)) {
      const variantId = userExps.get(experimentId)!;
      return experiment.variants.find(v => v.id === variantId) || null;
    }

    const hash = this.hashUserId(userId + experimentId);
    const random = hash / 0xFFFFFFFF;
    let cumulative = 0;
    let assignedVariant: Variant | null = null;

    for (const variant of experiment.variants) {
      cumulative += variant.weight / 100;
      if (random <= cumulative) {
        assignedVariant = variant;
        break;
      }
    }

    if (assignedVariant) {
      userExps.set(experimentId, assignedVariant.id);
      this.trackEvent({
        experimentId,
        variantId: assignedVariant.id,
        userId,
        eventType: 'exposure',
        timestamp: Date.now()
      });
    }

    return assignedVariant;
  }

  getAssignedVariant(experimentId: string, userId: string): Variant | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    const userExps = this.userAssignments.get(userId);
    if (!userExps || !userExps.has(experimentId)) return null;

    const variantId = userExps.get(experimentId)!;
    return experiment.variants.find(v => v.id === variantId) || null;
  }

  trackEvent(event: Omit<ExperimentEvent, 'timestamp'>): void {
    const fullEvent: ExperimentEvent = {
      ...event,
      timestamp: event.timestamp || Date.now()
    };
    this.events.push(fullEvent);
    this.emit('eventTracked', fullEvent);
  }

  trackConversion(experimentId: string, userId: string, value?: number): void {
    const variant = this.getAssignedVariant(experimentId, userId);
    if (!variant) return;

    this.trackEvent({
      experimentId,
      variantId: variant.id,
      userId,
      eventType: 'conversion',
      value,
      timestamp: Date.now()
    });
  }

  getResults(experimentId: string): ExperimentResult[] {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return [];

    const results: ExperimentResult[] = [];

    for (const variant of experiment.variants) {
      const exposureEvents = this.events.filter(
        e => e.experimentId === experimentId && e.variantId === variant.id && e.eventType === 'exposure'
      );
      const conversionEvents = this.events.filter(
        e => e.experimentId === experimentId && e.variantId === variant.id && e.eventType === 'conversion'
      );

      const visitors = exposureEvents.length;
      const conversions = conversionEvents.length;
      const conversionRate = visitors > 0 ? conversions / visitors : 0;

      const stdError = Math.sqrt((conversionRate * (1 - conversionRate)) / Math.max(visitors, 1));
      const marginOfError = 1.96 * stdError;
      const confidenceInterval: [number, number] = [
        Math.max(0, conversionRate - marginOfError),
        Math.min(1, conversionRate + marginOfError)
      ];

      results.push({
        experimentId,
        variantId: variant.id,
        name: variant.name,
        visitors,
        conversions,
        conversionRate: Math.round(conversionRate * 10000) / 100,
        confidenceInterval: [
          Math.round(confidenceInterval[0] * 10000) / 100,
          Math.round(confidenceInterval[1] * 10000) / 100
        ],
        isWinner: false,
        improvement: 0,
        pValue: 1,
        significant: false
      });
    }

    if (results.length >= 2) {
      const control = results[0];
      for (let i = 1; i < results.length; i++) {
        const treatment = results[i];
        const { pValue, significant } = this.calculateChiSquared(control, treatment);

        treatment.pValue = Math.round(pValue * 10000) / 10000;
        treatment.significant = significant;

        if (control.conversionRate > 0) {
          treatment.improvement = Math.round(
            ((treatment.conversionRate - control.conversionRate) / control.conversionRate) * 10000
          ) / 100;
        }

        if (significant && treatment.conversionRate > control.conversionRate) {
          treatment.isWinner = true;
          control.isWinner = false;
        } else if (!results.some(r => r.isWinner)) {
          control.isWinner = true;
        }
      }
    } else if (results.length === 1) {
      results[0].isWinner = true;
    }

    return results.sort((a, b) => b.conversionRate - a.conversionRate);
  }

  private calculateChiSquared(control: ExperimentResult, treatment: ExperimentResult): { pValue: number; significant: boolean } {
    const a = control.conversions;
    const b = control.visitors - control.conversions;
    const c = treatment.conversions;
    const d = treatment.visitors - treatment.conversions;
    const n = a + b + c + d;

    if (n === 0) return { pValue: 1, significant: false };

    const expectedA = ((a + c) * (a + b)) / n;
    const expectedB = ((a + c) * (b + d)) / n;
    const expectedC = ((c + d) * (a + b)) / n;
    const expectedD = ((c + d) * (b + d)) / n;

    const chiSquared =
      (Math.pow(a - expectedA, 2) / Math.max(expectedA, 0.0001)) +
      (Math.pow(b - expectedB, 2) / Math.max(expectedB, 0.0001)) +
      (Math.pow(c - expectedC, 2) / Math.max(expectedC, 0.0001)) +
      (Math.pow(d - expectedD, 2) / Math.max(expectedD, 0.0001));

    const pValue = 1 - this.gammaCDF(chiSquared / 2, 1, 1);
    return {
      pValue: Math.max(0, Math.min(1, pValue)),
      significant: pValue < 0.05
    };
  }

  private gammaCDF(x: number, alpha: number, beta: number): number {
    if (x < 0) return 0;
    if (x > 100) return 1;

    return this.regularizedIncompleteGamma(alpha, beta * x) / this.gammaFunction(alpha);
  }

  private regularizedIncompleteGamma(s: number, x: number): number {
    if (x < s + 1) {
      return this.gammaSeries(s, x);
    } else {
      return 1 - this.gammaCF(s, x);
    }
  }

  private gammaSeries(s: number, x: number): number {
    const EPSILON = 3e-7;
    let sum = 0;
    let term = 1 / s;
    sum = term;

    for (let n = 1; n < 200; n++) {
      term *= x / (s + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * EPSILON) break;
    }

    return sum * Math.exp(-x + s * Math.log(x) - this.logGamma(s));
  }

  private gammaCF(s: number, x: number): number {
    const EPSILON = 3e-7;
    const MAX_ITERATIONS = 200;
    let gln = this.logGamma(s);

    let b = x + 1 - s;
    let c = 1 / EPSILON;
    let d = 1 / b;
    let h = d;

    for (let i = 1; i <= MAX_ITERATIONS; i++) {
      const an = -i * (i - s);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < EPSILON) d = EPSILON;
      c = b + an / c;
      if (Math.abs(c) < EPSILON) c = EPSILON;
      d = 1 / d;
      const delta = d * c;
      h *= delta;
      if (Math.abs(delta - 1) < EPSILON) break;
    }

    return Math.exp(-x + s * Math.log(x) - gln) * h;
  }

  private logGamma(x: number): number {
    if (x < 0.5) {
      return Math.log(Math.PI / Math.sin(Math.PI * x)) - this.logGamma(1 - x);
    }

    x -= 1;
    const g = 7;
    const coef = [
      0.99999999999980993,
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];

    let xg = coef[0];
    for (let i = 1; i < g + 2; i++) {
      xg += coef[i] / (x + i);
    }

    const t = x + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(xg);
  }

  private gammaFunction(x: number): number {
    return Math.exp(this.logGamma(x));
  }

  private hashUserId(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  getStats(experimentId: string): {
    totalVisitors: number;
    totalConversions: number;
    overallConversionRate: number;
    duration: number;
    eventsPerDay: number;
  } {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return { totalVisitors: 0, totalConversions: 0, overallConversionRate: 0, duration: 0, eventsPerDay: 0 };
    }

    const expEvents = this.events.filter(e => e.experimentId === experimentId);
    const totalVisitors = expEvents.filter(e => e.eventType === 'exposure').length;
    const totalConversions = expEvents.filter(e => e.eventType === 'conversion').length;
    const overallConversionRate = totalVisitors > 0 ? totalConversions / totalVisitors : 0;
    const duration = experiment.startDate ? (Date.now() - experiment.startDate) / (1000 * 60 * 60 * 24) : 0;
    const eventsPerDay = duration > 0 ? totalVisitors / duration : 0;

    return {
      totalVisitors,
      totalConversions,
      overallConversionRate: Math.round(overallConversionRate * 10000) / 100,
      duration: Math.round(duration * 10) / 10,
      eventsPerDay: Math.round(eventsPerDay)
    };
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[ABTest] Event handler error for ${event}:`, error);
        }
      });
    }
  }

  exportData(): { experiments: Experiment[]; events: ExperimentEvent[] } {
    return {
      experiments: Array.from(this.experiments.values()),
      events: [...this.events]
    };
  }

  importData(data: { experiments: Experiment[]; events: ExperimentEvent[] }): void {
    data.experiments.forEach(exp => this.experiments.set(exp.id, exp));
    this.events = [...data.events];
  }

  reset(): void {
    this.experiments.clear();
    this.events = [];
    this.userAssignments.clear();
  }

  generateReport(experimentId: string): string {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return '实验不存在';

    const results = this.getResults(experimentId);
    const stats = this.getStats(experimentId);

    let report = `\n${'='.repeat(60)}\n`;
    report += `📊 A/B 测试报告: ${experiment.name}\n`;
    report += `${'='.repeat(60)}\n\n`;

    report += `📋 实验信息:\n`;
    report += `   ID: ${experiment.id}\n`;
    report += `   状态: ${this.getStatusText(experiment.status)}\n`;
    report += `   目标指标: ${experiment.targetMetric}\n`;
    report += `   流量分配: ${experiment.trafficAllocation}%\n\n`;

    report += `📈 总体统计:\n`;
    report += `   总访客数: ${stats.totalVisitors}\n`;
    report += `   总转化数: ${stats.totalConversions}\n`;
    report += `   整体转化率: ${stats.overallConversionRate}%\n`;
    report += `   运行时长: ${stats.duration} 天\n`;
    report += `   日均访客: ${stats.eventsPerDay}\n\n`;

    report += `${'─'.repeat(60)}\n`;
    report += `📊 变体对比:\n`;
    report += `${'─'.repeat(60)}\n\n`;

    results.forEach((result, index) => {
      const winnerBadge = result.isWinner ? ' 🏆' : '';
      report += `变体 ${index + 1}: ${result.name}${winnerBadge}\n`;
      report += `   访客数: ${result.visitors} | 转化数: ${result.conversions}\n`;
      report += `   转化率: ${result.conversionRate}%\n`;
      report += `   置信区间: [${result.confidenceInterval[0]}%, ${result.confidenceInterval[1]}%]\n`;

      if (index > 0) {
        report += `   相对提升: ${result.improvement >= 0 ? '+' : ''}${result.improvement}%\n`;
        report += `   P值: ${result.pValue}${result.significant ? ' ✅ 显著' : ' ❌ 不显著'}\n`;
      }
      report += '\n';
    });

    const winner = results.find(r => r.isWinner);
    if (winner && results.length > 1) {
      report += `${'='.repeat(60)}\n`;
      report += `✨ 结论: 推荐 "${winner.name}" 作为获胜变体\n`;
      report += `${'='.repeat(60)}\n`;
    }

    return report;
  }

  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      draft: '草稿',
      running: '运行中',
      paused: '已暂停',
      completed: '已完成'
    };
    return statusMap[status] || status;
  }
}

export const abTestEngine = new ABTestEngine();

export type { Experiment, Variant, ExperimentEvent, ExperimentResult };
