import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import redPacketApi from '../services/redPacketApi';

const isWeb = Platform.OS === 'web';

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
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [batchLoading, setBatchLoading] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await redPacketApi.getList({
        keyword: searchText || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page,
        limit: 20,
      });

      if (response.success) {
        setData(response.data.redPackets || []);
        setTotal(response.data.pagination?.total || 0);
      } else {
        console.error('加载数据失败:', response.message);
        if (!isRefresh) {
          setData([]);
          setTotal(0);
        }
      }
    } catch (error) {
      console.error('请求失败:', error);
      Alert.alert('错误', '网络请求失败，请检查网络连接');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchText, statusFilter, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadData();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText, statusFilter]);

  const toggleSelect = (id) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === data.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(data.map(item => item._id || item.id));
    }
  };

  const formatAmount = (amount) => {
    return `¥${Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  };

  const handleBatchActivate = async () => {
    if (selectedItems.length === 0) return;

    Alert.alert(
      '批量启用',
      `确定要启用选中的 ${selectedItems.length} 个红包吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            setBatchLoading(true);
            try {
              const response = await redPacketApi.batchActivate(selectedItems);
              if (response.success) {
                Alert.alert('成功', `已成功启用 ${selectedItems.length} 个红包`);
                setSelectedItems([]);
                loadData(true);
              } else {
                Alert.alert('失败', response.message || '操作失败');
              }
            } catch (error) {
              Alert.alert('错误', '网络请求失败');
            } finally {
              setBatchLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleBatchDeactivate = async () => {
    if (selectedItems.length === 0) return;

    Alert.alert(
      '批量禁用',
      `确定要禁用选中的 ${selectedItems.length} 个红包吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            setBatchLoading(true);
            try {
              const response = await redPacketApi.batchDeactivate(selectedItems);
              if (response.success) {
                Alert.alert('成功', `已成功禁用 ${selectedItems.length} 个红包`);
                setSelectedItems([]);
                loadData(true);
              } else {
                Alert.alert('失败', response.message || '操作失败');
              }
            } catch (error) {
              Alert.alert('错误', '网络请求失败');
            } finally {
              setBatchLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleBatchDelete = async () => {
    if (selectedItems.length === 0) return;

    Alert.alert(
      '批量删除',
      `确定要删除选中的 ${selectedItems.length} 个红包吗？此操作不可恢复！`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定删除',
          style: 'destructive',
          onPress: async () => {
            setBatchLoading(true);
            try {
              const response = await redPacketApi.batchDelete(selectedItems);
              if (response.success) {
                Alert.alert('成功', `已成功删除 ${selectedItems.length} 个红包`);
                setSelectedItems([]);
                loadData(true);
              } else {
                Alert.alert('失败', response.message || '操作失败');
              }
            } catch (error) {
              Alert.alert('错误', '网络请求失败');
            } finally {
              setBatchLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleExport = () => {
    navigation.navigate('AdminRedPacketExport', {
      selectedIds: selectedItems,
    });
  };

  const handleViewDetail = (item) => {
    navigation.navigate('AdminRedPacketDashboard', {
      id: item._id || item.id,
    });
  };

  const handlePublish = (item) => {
    Alert.alert(
      '发布确认',
      `确定要发布「${item.title}」吗？发布后红包将立即生效。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定发布',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await redPacketApi.publish(item._id || item.id);
              if (response.success) {
                Alert.alert('成功', '红包已成功发布！');
                loadData(true);
              } else {
                Alert.alert('失败', response.message || '发布失败');
              }
            } catch (error) {
              Alert.alert('错误', '网络请求失败');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handlePause = (item) => {
    Alert.alert(
      '暂停确认',
      `确定要暂停「${item.title}」吗？暂停后用户将无法领取。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定暂停',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await redPacketApi.update(item._id || item.id, {
                status: 'paused',
              });
              if (response.success) {
                Alert.alert('成功', '红包已暂停');
                loadData(true);
              } else {
                Alert.alert('失败', response.message || '操作失败');
              }
            } catch (error) {
              Alert.alert('错误', '网络请求失败');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.maxWidthContainer}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>红包管理</Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
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
          refreshControl={
            Platform.OS === 'web' ? null : (
              require('react-native').default?.RefreshControl ? (
                <require('react-native').default.RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => loadData(true)}
                />
              ) : null
            ) : null
          }
        >
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="搜索红包名称..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#999"
              onSubmitEditing={() => setPage(1)}
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
                <TouchableOpacity
                  style={[styles.batchBtn, styles.enableBtn]}
                  onPress={handleBatchActivate}
                  disabled={batchLoading}
                >
                  <Text style={[styles.batchBtnText, styles.enableBtnText]}>
                    {batchLoading ? '处理中...' : '批量启用'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.batchBtn, styles.disableBtn]}
                  onPress={handleBatchDeactivate}
                  disabled={batchLoading}
                >
                  <Text style={[styles.batchBtnText, styles.disableBtnText]}>
                    {batchLoading ? '处理中...' : '批量禁用'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.batchBtn, styles.deleteBtn]}
                  onPress={handleBatchDelete}
                  disabled={batchLoading}
                >
                  <Text style={[styles.batchBtnText, styles.deleteBtnText]}>
                    {batchLoading ? '处理中...' : '批量删除'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.batchBtn, styles.exportBtn]}
                  onPress={handleExport}
                >
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
                  selectedItems.length === data.length &&
                    data.length > 0 &&
                    styles.checkboxChecked,
                ]}
              >
                {selectedItems.length === data.length &&
                  data.length > 0 && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
              </View>
            </TouchableOpacity>
            <Text style={styles.selectAllText}>全选</Text>
            <Text style={styles.totalCount}>共 {total} 条</Text>
          </View>

          {/* Data List */}
          {data.length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>暂无红包数据</Text>
              <Text style={styles.emptySubText}>点击右上角 + 创建第一个红包活动</Text>
            </View>
          ) : (
            data.map((item) => {
              const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
              const itemId = item._id || item.id;
              return (
                <TouchableOpacity
                  key={itemId}
                  style={styles.card}
                  onPress={() => handleViewDetail(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <TouchableOpacity
                      onPress={() => toggleSelect(itemId)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          selectedItems.includes(itemId) && styles.checkboxChecked,
                        ]}
                      >
                        {selectedItems.includes(itemId) && (
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
                        {(item.totalCount - item.remainingCount) || item.claimedCount || 0}/{item.totalCount || 0}
                      </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>领取率</Text>
                      <Text style={[styles.statValue, { color: '#007AFF' }]}>
                        {item.claimRate ? (item.claimRate * 100).toFixed(1) : '0.0'}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleViewDetail(item);
                      }}
                    >
                      <Text style={styles.actionButtonText}>查看详情</Text>
                    </TouchableOpacity>
                    {item.status === 'draft' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.primaryActionButton]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handlePublish(item);
                        }}
                      >
                        <Text style={[styles.actionButtonText, styles.primaryActionText]}>
                          发布
                        </Text>
                      </TouchableOpacity>
                    )}
                    {item.status === 'active' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.warningActionButton]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handlePause(item);
                        }}
                      >
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
          {total > 20 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
                disabled={page <= 1 || loading}
                onPress={() => setPage(p => Math.max(1, p - 1))}
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
                第 {page} 页 / 共 {Math.ceil(total / 20)} 页
              </Text>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  page >= Math.ceil(total / 20) && styles.pageButtonDisabled,
                ]}
                disabled={page >= Math.ceil(total / 20) || loading}
                onPress={() => setPage(p => p + 1)}
              >
                <Text
                  style={[
                    styles.pageButtonText,
                    page >= Math.ceil(total / 20) && styles.pageButtonTextDisabled,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
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
