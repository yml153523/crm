import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';

const isWeb = Platform.OS === 'web';

const MOCK_KPI = {
  totalAmount: 100000,
  claimedAmount: 45230,
  remainingAmount: 54770,
  claimRate: 45.23,
  claimedCount: 67,
  remainingCount: 33,
};

const MOCK_RECENT_CLAIMS = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  userName: `用户${i + 1}`,
  amount: (Math.random() * 100).toFixed(2),
  time: new Date(Date.now() - i * 60000).toLocaleTimeString('zh-CN'),
}));

const AdminRedPacketDashboardScreen = ({ navigation, route }) => {
  const { id } = route.params || {};
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const formatAmount = (amount) => `¥${(amount / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.maxWidthContainer}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>数据监控</Text>
            <View style={{ width: 48 }} />
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.maxWidthContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>数据监控</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* KPI Cards */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>总发放金额</Text>
              <Text style={styles.kpiValue}>{formatAmount(MOCK_KPI.totalAmount)}</Text>
            </View>
            <View style={[styles.kpiCard, styles.kpiCardPrimary]}>
              <Text style={styles.kpiLabel}>已领取金额</Text>
              <Text style={[styles.kpiValue, styles.kpiValuePrimary]}>{formatAmount(MOCK_KPI.claimedAmount)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>剩余金额</Text>
              <Text style={styles.kpiValue}>{formatAmount(MOCK_KPI.remainingAmount)}</Text>
            </View>
            <View style={[styles.kpiCard, styles.kpiCardSuccess]}>
              <Text style={styles.kpiLabel}>领取率</Text>
              <Text style={[styles.kpiValue, styles.kpiValueSuccess]}>{MOCK_KPI.claimRate}%</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{MOCK_KPI.claimedCount}</Text>
              <Text style={styles.statLabel}>已领人数</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{MOCK_KPI.remainingCount}</Text>
              <Text style={styles.statLabel}>剩余名额</Text>
            </View>
          </View>

          {/* Time Range Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.timeRangeScroll}
            contentContainerStyle={styles.timeRangeContent}
          >
            {[
              { value: '1d', label: '今日' },
              { value: '7d', label: '近7天' },
              { value: '30d', label: '近30天' },
              { value: 'all', label: '全部' },
            ].map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.timeRangeChip,
                  timeRange === option.value && styles.timeRangeChipActive,
                ]}
                onPress={() => setTimeRange(option.value)}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    timeRange === option.value && styles.timeRangeTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Trend Chart Placeholder */}
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>📈 领取趋势</Text>
            <View style={styles.chartPlaceholder}>
              <Text style={styles.placeholderIcon}>📊</Text>
              <Text style={styles.placeholderText}>趋势图区域</Text>
              <Text style={styles.placeholderSubText}>展示每日领取金额和人数变化</Text>
            </View>
          </View>

          {/* Distribution Chart Placeholder */}
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle">🎯 金额分布</Text>
            <View style={styles.distributionRow}>
              {[
                { range: '0-1元', percent: 15, color: '#34C759' },
                { range: '1-5元', percent: 35, color: '#007AFF' },
                { range: '5-10元', percent: 30, color: '#FF9500' },
                { range: '10元+', percent: 20, color: '#FF3B30' },
              ].map((item, idx) => (
                <View key={idx} style={styles.distItem}>
                  <View style={[styles.distBar, { backgroundColor: item.color, width: `${item.percent}%` }]} />
                  <Text style={styles.distPercent}>{item.percent}%</Text>
                  <Text style={styles.distRange}>{item.range}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Recent Claims */}
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={styles.sectionTitle}>🔔 实时动态</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>查看全部 ›</Text>
              </TouchableOpacity>
            </View>
            
            {MOCK_RECENT_CLAIMS.map(claim => (
              <View key={claim.id} style={styles.claimItem}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{claim.userName.slice(-2)}</Text>
                </View>
                <View style={styles.claimInfo}>
                  <Text style={styles.claimUserName}>{claim.userName}</Text>
                  <Text style={styles.claimTime}>{claim.time}</Text>
                </View>
                <View style={styles.amountBadge}>
                  <Text style={styles.amountText}>+¥{claim.amount}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  maxWidthContainer: { flex: 1, width: '100%', maxWidth: isWeb ? 800 : 600, alignSelf: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 26, color: '#334155', lineHeight: 28, marginTop: -3 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: '#64748B' },

  content: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 80 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    ...Platform.select({ web: { boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }, default: { elevation: 2 } }),
  },
  kpiCardPrimary: { backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#007AFF' },
  kpiCardSuccess: { backgroundColor: '#D1FAE5', borderWidth: 1.5, borderColor: '#34C759' },
  kpiLabel: { fontSize: 12, color: '#64748B', marginBottom: 8 },
  kpiValue: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  kpiValuePrimary: { color: '#007AFF' },
  kpiValueSuccess: { color: '#059669' },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({ web: { boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }, default: { elevation: 1 } }),
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  statLabel: { fontSize: 13, color: '#94A3B8' },
  statDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },

  timeRangeScroll: { marginBottom: 16 },
  timeRangeContent: { gap: 8, paddingRight: 16 },
  timeRangeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  timeRangeChipActive: { backgroundColor: '#007AFF' },
  timeRangeText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  timeRangeTextActive: { color: '#FFFFFF' },

  chartSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({ web: { boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }, default: { elevation: 1 } }),
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  chartPlaceholder: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  placeholderIcon: { fontSize: 50, marginBottom: 12 },
  placeholderText: { fontSize: 16, fontWeight: '600', color: '#475569', marginBottom: 4 },
  placeholderSubText: { fontSize: 13, color: '#94A3B8' },

  distributionRow: { flexDirection: 'row', gap: 10 },
  distItem: { flex: 1, alignItems: 'center' },
  distBar: { height: 80, borderRadius: 8, marginBottom: 8 },
  distPercent: { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  distRange: { fontSize: 11, color: '#64748B' },

  recentSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({ web: { boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }, default: { elevation: 1 } }),
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: { fontSize: 14, color: '#007AFF', fontWeight: '500' },

  claimItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 13, fontWeight: '600', color: '#007AFF' },
  claimInfo: { flex: 1 },
  claimUserName: { fontSize: 15, fontWeight: '500', color: '#1A1A1A', marginBottom: 2 },
  claimTime: { fontSize: 12, color: '#94A3B8' },
  amountBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  amountText: { fontSize: 14, fontWeight: '700', color: '#059669' },
});

export default AdminRedPacketDashboardScreen;
