import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';

const isWeb = Platform.OS === 'web';

const MOCK_DATA = Array.from({ length: 20 }, (_, i) => ({
  _id: `rp_${i + 1}`,
  title: `春节红包活动 ${i + 1}`,
  type: i % 2 === 0 ? 'random' : 'fixed',
  totalAmount: (i + 1) * 10000,
  totalCount: 100 * (i + 1),
  remainingCount: Math.floor(100 * (i + 1) * (1 - i * 0.05)),
  remainingAmount: Math.floor((i + 1) * 10000 * (1 - i * 0.05)),
  status: ['draft', 'active', 'paused', 'expired', 'finished'][i % 5],
  createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  claimRate: ((100 - i * 5) / 100).toFixed(2),
}));

const STATUS_CONFIG = {
  draft: { label: '草稿', color: '#8E8E93', bgColor: '#F2F2F7' },
  active: { label: '进行中', color: '#34C759', bgColor: '#D1FAE5' },
  paused: { label: '已暂停', color: '#FF9500', bgColor: '#FEF3C7' },
  expired: { label: '已过期', color: '#8E8E93', bgColor: '#F2F2F7' },
  finished: { label: '已结束', color: '#007AFF', bgColor: '#DBEAFE' },
  depleted: { label: '已抢光', color: '#FF3B30', bgColor: '#FEE2E2' },
};

const AdminRedPacketManagementScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItems, setSelectedItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const filteredData = MOCK_DATA.filter(item => {
    const matchSearch = item.title.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleSelect = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredData.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredData.map(item => item._id));
    }
  };

  const formatAmount = (amount) => {
    return `¥${(amount / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.maxWidthContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>红包管理</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AdminRedPacketCreate')}
          >
            <View style={styles.addButtonInner}>
              <Text style={styles.addButtonText}>+</Text>
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="搜索红包名称..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#999"
            />
          </View>

          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            {['all', 'draft', 'active', 'paused', 'expired'].map(status => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  statusFilter === status && styles.filterChipActive,
                ]}
                onPress={() => setStatusFilter(status)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === status && styles.filterChipTextActive,
                  ]}
                >
                  {status === 'all' ? '全部' : STATUS_CONFIG[status]?.label || status}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Batch Actions Bar */}
          {selectedItems.length > 0 && (
            <View style={styles.batchActionBar}>
              <Text style={styles.batchActionText}>
                已选 {selectedItems.length} 项
              </Text>
              <View style={styles.batchActionButtons}>
                <TouchableOpacity style={[styles.batchBtn, styles.enableBtn]}>
                  <Text style={[styles.batchBtnText, styles.enableBtnText]}>批量启用</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.batchBtn, styles.disableBtn]}>
                  <Text style={[styles.batchBtnText, styles.disableBtnText]}>批量禁用</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.batchBtn, styles.deleteBtn]}>
                  <Text style={[styles.batchBtnText, styles.deleteBtnText]}>批量删除</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.batchBtn, styles.exportBtn]}>
                  <Text style={[styles.batchBtnText, styles.exportBtnText]}>导出</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Select All Checkbox */}
          <View style={styles.selectAllRow}>
            <TouchableOpacity onPress={toggleSelectAll} style={styles.checkbox}>
              <View
                style={[
                  styles.checkboxInner,
                  selectedItems.length === filteredData.length &&
                    filteredData.length > 0 &&
                    styles.checkboxChecked,
                ]}
              >
                {selectedItems.length === filteredData.length &&
                  filteredData.length > 0 && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
              </View>
            </TouchableOpacity>
            <Text style={styles.selectAllText}>全选</Text>
            <Text style={styles.totalCount}>共 {filteredData.length} 条</Text>
          </View>

          {/* Data List */}
          {filteredData.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>暂无红包数据</Text>
              <Text style={styles.emptySubText}>点击右上角 + 创建第一个红包活动</Text>
            </View>
          ) : (
            filteredData.map((item) => {
              const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
              return (
                <TouchableOpacity
                  key={item._id}
                  style={styles.card}
                  onPress={() =>
                    navigation.navigate('AdminRedPacketDashboard', { id: item._id })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <TouchableOpacity
                      onPress={() => toggleSelect(item._id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          selectedItems.includes(item._id) && styles.checkboxChecked,
                        ]}
                      >
                        {selectedItems.includes(item._id) && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                    <View style={styles.cardTitleArea}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.cardSubtitle}>
                        {item.type === 'random' ? '随机金额' : '固定金额'} · 创建于{' '}
                        {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusConfig.bgColor },
                      ]}
                    >
                      <Text
                        style={[styles.statusText, { color: statusConfig.color }]}
                      >
                        {statusConfig.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>总金额</Text>
                      <Text style={styles.statValue}>{formatAmount(item.totalAmount)}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>已领/总数</Text>
                      <Text style={styles.statValue}>
                        {item.totalCount - item.remainingCount}/{item.totalCount}
                      </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>领取率</Text>
                      <Text style={[styles.statValue, { color: '#007AFF' }]}>
                        {(item.claimRate * 100).toFixed(1)}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <TouchableOpacity style={styles.actionButton}>
                      <Text style={styles.actionButtonText}>查看详情</Text>
                    </TouchableOpacity>
                    {item.status === 'draft' && (
                      <TouchableOpacity style={[styles.actionButton, styles.primaryActionButton]}>
                        <Text style={[styles.actionButtonText, styles.primaryActionText]}>
                          发布
                        </Text>
                      </TouchableOpacity>
                    )}
                    {item.status === 'active' && (
                      <TouchableOpacity style={[styles.actionButton, styles.warningActionButton]}>
                        <Text style={[styles.actionButtonText, styles.warningActionText]}>
                          暂停
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* Pagination */}
          {filteredData.length > 0 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
                disabled={page <= 1}
                onPress={() => setPage(p => p - 1)}
              >
                <Text
                  style={[
                    styles.pageButtonText,
                    page <= 1 && styles.pageButtonTextDisabled,
                  ]}
                >
                  ‹ 上一页
                </Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>
                第 {page} 页 / 共 {Math.ceil(filteredData.length / 20) || 1} 页
              </Text>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  page >= Math.ceil(filteredData.length / 20) && styles.pageButtonDisabled,
                ]}
                disabled={page >= Math.ceil(filteredData.length / 20)}
                onPress={() => setPage(p => p + 1)}
              >
                <Text
                  style={[
                    styles.pageButtonText,
                    page >= Math.ceil(filteredData.length / 20) && styles.pageButtonTextDisabled,
                  ]}
                >
                  下一页 ›
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  maxWidthContainer: {
    flex: 1,
    width: '100%',
    maxWidth: isWeb ? 900 : 600,
    alignSelf: 'center',
  },
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
  backIcon: {
    fontSize: 26,
    color: '#334155',
    lineHeight: 28,
    marginTop: -3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  addButton: {
    padding: 4,
  },
  addButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterContent: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  batchActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  batchActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  batchActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  batchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  enableBtn: {
    backgroundColor: '#D1FAE5',
  },
  enableBtnText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  disableBtn: {
    backgroundColor: '#FEF3C7',
  },
  disableBtnText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
  },
  deleteBtnText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  exportBtn: {
    backgroundColor: '#DBEAFE',
  },
  exportBtnText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D0D5DD',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  selectAllText: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
  },
  totalCount: {
    fontSize: 13,
    color: '#94A3B8',
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      web: { boxShadow: '0 1px 6px rgba(0,0,0,0.06)' },
      default: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTitleArea: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  primaryActionButton: {
    backgroundColor: '#007AFF',
  },
  primaryActionText: {
    color: '#FFFFFF',
  },
  warningActionButton: {
    backgroundColor: '#FF9500',
  },
  warningActionText: {
    color: '#FFFFFF',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 10,
    gap: 20,
  },
  pageButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  pageButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  pageButtonTextDisabled: {
    color: '#9CA3AF',
  },
  pageInfo: {
    fontSize: 14,
    color: '#64748B',
  },
});

export default AdminRedPacketManagementScreen;
