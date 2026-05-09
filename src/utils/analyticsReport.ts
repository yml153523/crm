interface Dimension {
  id: string;
  label: string;
  type: 'time' | 'category' | 'numeric' | 'boolean';
  values?: string[];
}

interface Metric {
  id: string;
  label: string;
  type: 'count' | 'sum' | 'average' | 'percentage' | 'ratio';
  format: 'number' | 'currency' | 'percent' | 'duration';
}

interface ReportConfig {
  id: string;
  name: string;
  description: string;
  dimensions: Dimension[];
  metrics: Metric[];
  filters?: Array<{
    dimensionId: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
    value: any;
  }>;
  sortBy?: { metricId: string; order: 'asc' | 'desc' };
  limit?: number;
  chartType?: 'line' | 'bar' | 'pie' | 'table' | 'heatmap' | 'funnel';
}

interface DataPoint {
  dimensions: Record<string, any>;
  metrics: Record<string, number>;
  timestamp?: number;
}

interface ReportResult {
  config: ReportConfig;
  data: DataPoint[];
  summary: {
    totalRecords: number;
    generatedAt: number;
    executionTime: number;
  };
  insights: Insight[];
}

interface Insight {
  type: 'trend' | 'anomaly' | 'correlation' | 'opportunity' | 'warning';
  title: string;
  description: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  confidence: number;
  suggestions: string[];
}

class AnalyticsReportEngine {
  private reportTemplates: Map<string, ReportConfig> = new Map();
  private dataCache: Map<string, ReportResult> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  createReport(config: ReportConfig): string {
    this.reportTemplates.set(config.id, config);
    return config.id;
  }

  getReportTemplate(id: string): ReportConfig | undefined {
    return this.reportTemplates.get(id);
  }

  getAllTemplates(): ReportConfig[] {
    return Array.from(this.reportTemplates.values());
  }

  generateReport(
    templateIdOrConfig: string | ReportConfig,
    rawData: any[]
  ): ReportResult {
    const startTime = Date.now();

    const config = typeof templateIdOrConfig === 'string'
      ? this.reportTemplates.get(templateIdOrConfig)!
      : templateIdOrConfig;

    if (!config) {
      throw new Error(`Report template not found: ${templateIdOrConfig}`);
    }

    let processedData = this.applyFilters(rawData, config.filters || []);
    processedData = this.aggregateData(processedData, config.dimensions, config.metrics);

    if (config.sortBy) {
      processedData = this.sortData(processedData, config.sortBy);
    }

    if (config.limit && processedData.length > config.limit) {
      processedData = processedData.slice(0, config.limit);
    }

    const insights = this.generateInsights(processedData, config);
    const executionTime = Date.now() - startTime;

    const result: ReportResult = {
      config,
      data: processedData,
      summary: {
        totalRecords: processedData.length,
        generatedAt: Date.now(),
        executionTime
      },
      insights
    };

    this.dataCache.set(config.id, result);
    return result;
  }

  compareReports(
    report1Id: string,
    report2Id: string,
    options: { metricIds?: string[] } = {}
  ): {
    comparison: Array<{
      metricId: string;
      value1: number;
      value2: number;
      change: number;
      changePercent: number;
    }>;
    significantChanges: Array<{ metricId: string; change: number; direction: 'up' | 'down' }>;
  } {
    const report1 = this.dataCache.get(report1Id);
    const report2 = this.dataCache.get(report2Id);

    if (!report1 || !report2) {
      throw new Error('One or both reports not found in cache');
    }

    const metricIds = options.metricIds ||
      [...new Set([...report1.config.metrics.map(m => m.id), ...report2.config.metrics.map(m => m.id)])];

    const comparison = [];
    const significantChanges = [];

    for (const metricId of metricIds) {
      const value1 = this.getTotalMetric(report1.data, metricId);
      const value2 = this.getTotalMetric(report2.data, metricId);
      const change = value2 - value1;
      const changePercent = value1 !== 0 ? ((change / value1) * 100) : 0;

      comparison.push({ metricId, value1, value2, change, changePercent });

      if (Math.abs(changePercent) > 10) {
        significantChanges.push({
          metricId,
          change: changePercent,
          direction: changePercent > 0 ? 'up' : 'down'
        });
      }
    }

    return { comparison, significantChanges };
  }

  exportToCSV(result: ReportResult): string {
    const headers = [
      ...result.config.dimensions.map(d => d.label),
      ...result.config.metrics.map(m => m.label)
    ];

    const rows = result.data.map(point => [
      ...result.config.dimensions.map(d => point.dimensions[d.id]),
      ...result.config.metrics.map(m => this.formatMetricValue(m, point.metrics[m.id]))
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  exportToJSON(result: ReportResult): string {
    return JSON.stringify(result, null, 2);
  }

  private initializeTemplates(): void {
    this.createReport({
      id: 'sales_overview',
      name: '销售总览',
      description: '按时间维度的销售数据分析',
      dimensions: [
        { id: 'date', label: '日期', type: 'time' },
        { id: 'category', label: '类别', type: 'category', values: ['视频', '课程', '商品'] }
      ],
      metrics: [
        { id: 'revenue', label: '收入', type: 'sum', format: 'currency' },
        { id: 'orders', label: '订单数', type: 'count', format: 'number' },
        { id: 'avg_order_value', label: '平均订单价值', type: 'average', format: 'currency' },
        { id: 'conversion_rate', label: '转化率', type: 'percentage', format: 'percent' }
      ],
      chartType: 'line'
    });

    this.createReport({
      id: 'user_behavior',
      name: '用户行为分析',
      description: '用户在平台上的行为模式分析',
      dimensions: [
        { id: 'action_type', label: '行为类型', type: 'category', values: ['浏览', '点赞', '加购', '购买', '分享'] },
        { id: 'user_segment', label: '用户群体', type: 'category', values: ['新用户', '回访用户', 'VIP用户'] }
      ],
      metrics: [
        { id: 'count', label: '次数', type: 'count', format: 'number' },
        { id: 'unique_users', label: '独立用户数', type: 'count', format: 'number' },
        { id: 'avg_per_user', label: '人均次数', type: 'average', format: 'number' }
      ],
      chartType: 'bar'
    });

    this.createReport({
      id: 'product_performance',
      name: '商品表现分析',
      description: '各商品的销售表现和趋势',
      dimensions: [
        { id: 'product_name', label: '商品名称', type: 'category' },
        { id: 'price_range', label: '价格区间', type: 'category', values: ['0-50', '50-100', '100-200', '200+'] }
      ],
      metrics: [
        { id: 'views', label: '浏览量', type: 'count', format: 'number' },
        { id: 'purchases', label: '购买量', type: 'count', format: 'number' },
        { id: 'revenue', label: '销售额', type: 'sum', format: 'currency' },
        { id: 'conversion_rate', label: '转化率', type: 'percentage', format: 'percent' },
        { id: 'return_rate', label: '退货率', type: 'percentage', format: 'percent' }
      ],
      sortBy: { metricId: 'revenue', order: 'desc' },
      limit: 20,
      chartType: 'table'
    });

    this.createReport({
      id: 'funnel_analysis',
      name: '转化漏斗分析',
      description: '从浏览到购买的完整转化路径',
      dimensions: [
        { id: 'stage', label: '漏斗阶段', type: 'category', values: ['曝光', '点击', '浏览详情', '加入购物车', '下单', '支付完成'] }
      ],
      metrics: [
        { id: 'users', label: '用户数', type: 'count', format: 'number' },
        { id: 'conversion_rate', label: '阶段转化率', type: 'percentage', format: 'percent' },
        { id: 'overall_conversion', label: '总体转化率', type: 'percentage', format: 'percent' },
        { id: 'drop_off', label: '流失率', type: 'percentage', format: 'percent' }
      ],
      chartType: 'funnel'
    });

    this.createReport({
      id: 'cohort_retention',
      name: '用户留存分析',
      description: '按注册时间分组的用户留存情况',
      dimensions: [
        { id: 'cohort', label: '用户批次', type: 'time' },
        { id: 'week', label: '周次', type: 'numeric' }
      ],
      metrics: [
        { id: 'total_users', label: '总用户数', type: 'count', format: 'number' },
        { id: 'active_users', label: '活跃用户', type: 'count', format: 'number' },
        { id: 'retention_rate', label: '留存率', type: 'percentage', format: 'percent' }
      ],
      chartType: 'heatmap'
    });
  }

  private applyFilters(data: any[], filters: ReportConfig['filters']): any[] {
    if (!filters || filters.length === 0) return data;

    return data.filter(item => {
      return filters.every(filter => {
        const itemValue = item[filter.dimensionId];

        switch (filter.operator) {
          case 'equals':
            return itemValue === filter.value;
          case 'not_equals':
            return itemValue !== filter.value;
          case 'greater_than':
            return Number(itemValue) > Number(filter.value);
          case 'less_than':
            return Number(itemValue) < Number(filter.value);
          case 'contains':
            return String(itemValue).includes(String(filter.value));
          default:
            return true;
        }
      });
    });
  }

  private aggregateData(
    data: any[],
    dimensions: Dimension[],
    metrics: Metric[]
  ): DataPoint[] {
    const groups = new Map<string, any[]>();

    for (const item of data) {
      const key = dimensions.map(d => `${d.id}:${item[d.id] ?? 'unknown'}`).join('|');

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }

    const aggregated: DataPoint[] = [];

    for (const [key, items] of groups) {
      const dimValues: Record<string, any> = {};
      dimensions.forEach((d, i) => {
        dimValues[d.id] = items[0][d.id];
      });

      const metricValues: Record<string, number> = {};

      for (const metric of metrics) {
        const values = items.map(item => Number(item[metric.id]) || 0);

        switch (metric.type) {
          case 'count':
            metricValues[metric.id] = values.length;
            break;
          case 'sum':
            metricValues[metric.id] = values.reduce((sum, v) => sum + v, 0);
            break;
          case 'average':
            metricValues[metric.id] = values.length > 0
              ? values.reduce((sum, v) => sum + v, 0) / values.length
              : 0;
            break;
          case 'percentage':
            const total = values.reduce((sum, v) => sum + v, 0);
            metricValues[metric.id] = total > 0 ? (values.filter(v => v > 0).length / values.length) * 100 : 0;
            break;
          case 'ratio':
            if (values.length >= 2) {
              metricValues[metric.id] = values[0] / Math.max(values[1], 1);
            } else {
              metricValues[metric.id] = 0;
            }
            break;
        }
      }

      aggregated.push({
        dimensions: dimValues,
        metrics: metricValues,
        timestamp: Date.now()
      });
    }

    return aggregated;
  }

  private sortData(data: DataPoint[], sortBy: { metricId: string; order: 'asc' | 'desc' }): DataPoint[] {
    return [...data].sort((a, b) => {
      const aVal = a.metrics[sortBy.metricId] || 0;
      const bVal = b.metrics[sortBy.metricId] || 0;
      return sortBy.order === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }

  private generateInsights(data: DataPoint[], config: ReportConfig): Insight[] {
    const insights: Insight[] = [];

    for (const metric of config.metrics) {
      const values = data.map(d => d.metrics[metric.id]).filter(v => !isNaN(v));

      if (values.length < 2) continue;

      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / values.length);

      const trend = this.calculateTrend(values);
      if (Math.abs(trend) > 5) {
        insights.push({
          type: 'trend',
          title: `${metric.label}呈现${trend > 0 ? '上升' : '下降'}趋势`,
          description: `过去一段时间${metric.label}${trend > 0 ? '增长' : '下降'}了约 ${Math.abs(trend).toFixed(1)}%`,
          severity: Math.abs(trend) > 15 ? (trend > 0 ? 'success' : 'warning') : 'info',
          confidence: Math.min(95, 60 + Math.abs(trend)),
          suggestions: trend > 0
            ? [`继续保持当前策略`, `分析成功因素并复制到其他领域`]
            : [`排查可能的原因`, `考虑调整策略或增加推广`]
        });
      }

      const outliers = this.detectOutliers(values, avg, stdDev);
      if (outliers.length > 0) {
        insights.push({
          type: 'anomaly',
          title: `检测到${outliers.length}个异常值`,
          description: `${metric.label}存在显著偏离正常范围的数值，最高${max.toFixed(2)}，最低${min.toFixed(2)}`,
          severity: outliers.length > values.length * 0.2 ? 'warning' : 'info',
          confidence: 75,
          suggestions: [`检查数据录入是否正确`, `分析异常值产生的原因`]
        });
      }

      if (stdDev / avg > 0.5 && avg > 0) {
        insights.push({
          type: 'opportunity',
          title: `${metric.label}波动较大`,
          description: `变异系数为${((stdDev / avg) * 100).toFixed(1)}%，存在优化空间`,
          severity: 'info',
          confidence: 70,
          suggestions: [`分析波动的根本原因`, `寻找稳定化方案以提升可预测性`]
        });
      }
    }

    return insights.slice(0, 8);
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    if (denominator === 0) return 0;

    const slope = numerator / denominator;
    const baseline = yMean !== 0 ? yMean : 1;

    return (slope * n / baseline) * 100;
  }

  private detectOutliers(values: number[], mean: number, stdDev: number): number[] {
    if (stdDev === 0) return [];

    const threshold = 2;
    return values.filter(v => Math.abs(v - mean) > threshold * stdDev);
  }

  private getTotalMetric(data: DataPoint[], metricId: string): number {
    return data.reduce((sum, point) => sum + (point.metrics[metricId] || 0), 0);
  }

  private formatMetricValue(metric: Metric, value: number): string {
    switch (metric.format) {
      case 'currency':
        return `¥${value.toFixed(2)}`;
      case 'percent':
        return `${value.toFixed(2)}%`;
      case 'duration':
        const hours = Math.floor(value / 3600);
        const minutes = Math.floor((value % 3600) / 60);
        return `${hours}h ${minutes}m`;
      default:
        return Math.round(value).toString();
    }
  }
}

export const analyticsEngine = new AnalyticsReportEngine();

export type {
  Dimension,
  Metric,
  ReportConfig,
  DataPoint,
  ReportResult,
  Insight
};
