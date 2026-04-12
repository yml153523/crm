import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';

const isWeb = Platform.OS === 'web';

const MOCK_EXPORT_HISTORY = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  fileName: `红包数据导出_${new Date(Date.now() - i * 86400000).toLocaleDateString('zh-CN')}`,
  format: i % 2 === 0 ? 'Excel' : 'PDF',
  size: `${(2.5 + Math.random() * 3).toFixed(1)} MB`,
  status: ['completed', 'processing', 'completed', 'completed', 'failed'][i],
  time: new Date(Date.now() - i * 86400000).toLocaleString('zh-CN'),
}));

const AdminRedPacketExportScreen = ({ navigation }) => {
  const [format, setFormat] = useState('excel');
  const [dateRange, setDateRange] = useState('30d');
  const [selectedFields, setSelectedFields] = useState([
    'redPacketTitle', 'userName', 'userPhone', 'amount', 'claimedAt',
    'triggerCondition', 'status',
  ]);
  const [isExporting, setIsExporting] = useState(false);

  const ALL_FIELDS = [
    { key: 'redPacketTitle', label: '红包名称' },
    { key: 'userName', label: '领取人' },
    { key: 'userPhone', label: '手机号' },
    { key: 'amount', label: '领取金额' },
    { key: 'claimedAt', label: '领取时间' },
    { key: 'triggerCondition', label: '触发条件' },
    { key: 'status', label: '状态' },
    { key: 'userLevel', label: '用户等级' },
    { key: 'expiresAt', label: '过期时间' },
    { key: 'usedAt', label: '使用时间' },
  ];

  const toggleField = (key) => {
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    );
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert(`导出任务已创建！\n\n格式：${format.toUpperCase()}\n字段数：${selectedFields.length}\n时间范围：${dateRange}`);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.maxWidthContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>导出报表</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Format Selection */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>📄 导出格式</Text>
            <View style={styles.formatRow}>
              {[
                { value: 'excel', icon: '📊', label: 'Excel (.xlsx)', desc: '适合数据分析' },
                { value: 'pdf', icon: '📑', label: 'PDF (.pdf)', desc: '适合打印归档' },
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.formatOption,
                    format === option.value && styles.formatOptionActive,
                  ]}
                  onPress={() => setFormat(option.value)}
                >
                  <Text style={styles.formatIcon}>{option.icon}</Text>
                  <Text
                    style={[
                      styles.formatLabel,
                      format === option.value && styles.formatLabelActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.formatDesc}>{option.desc}</Text>
                  {format === option.value && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkBadgeText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date Range */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>📅 时间范围</Text>
            <View style={styles.dateOptions}>
              {[
                { value: '1d', label: '今日' },
                { value: '7d', label: '近7天' },
                { value: '30d', label: '近30天' },
                { value: '90d', label: '近90天' },
                { value: 'custom', label: '自定义' },
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dateChip,
                    dateRange === option.value && styles.dateChipActive,
                  ]}
                  onPress={() => setDateRange(option.value)}
                >
                  <Text
                    style={[
                      styles.dateChipText,
                      dateRange === option.value && styles.dateChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {dateRange === 'custom' && (
              <View style={styles.customDateRow}>
                <TextInput style={styles.dateInput} placeholder="开始日期" />
                <Text style={styles.dateSeparator}>至</Text>
                <TextInput style={styles.dateInput} placeholder="结束日期" />
              </View>
            )}
          </View>

          {/* Field Selection */}
          <View style={styles.sectionCard}>
            <View style={styles.fieldHeader}>
              <Text style={styles.sectionTitle">🔖 导出字段</Text>
              <TouchableOpacity
                onPress={() =>
                  setSelectedFields(selectedFields.length === ALL_FIELDS.length ? [] : ALL_FIELDS.map(f => f.key))
                }
              >
                <Text style={styles.toggleAllText}>
                  {selectedFields.length === ALL_FIELDS.length ? '取消全选' : '全选'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.fieldGrid}>
              {ALL_FIELDS.map(field => (
                <TouchableOpacity
                  key={field.key}
                  style={[
                    styles.fieldItem,
                    selectedFields.includes(field.key) && styles.fieldItemSelected,
                  ]}
                  onPress={() => toggleField(field.key)}
                >
                  <View
                    style={[
                      styles.fieldCheckbox,
                      selectedFields.includes(field.key) && styles.fieldCheckboxSelected,
                    ]}
                  >
                    {selectedFields.includes(field.key) && (
                      <Text style={styles.checkboxCheck}>✓</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.fieldLabel,
                      selectedFields.includes(field.key) && styles.fieldLabelSelected,
                    ]}
                  >
                    {field.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.selectedCount}>
              已选择 {selectedFields.length}/{ALL_FIELDS.length} 个字段
            </Text>
          </View>

          {/* Export Button */}
          <TouchableOpacity
            style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
            onPress={handleExport}
            disabled={isExporting || selectedFields.length === 0}
          >
            {isExporting ? (
              <Text style={styles.exportButtonText}>⏳ 导出中...</Text>
            ) : (
              <Text style={styles.exportButtonText}>🚀 开始导出</Text>
            )}
          </TouchableOpacity>

          {selectedFields.length === 0 && (
            <Text style={styles.errorHint}>请至少选择一个导出字段</Text>
          )}

          {/* Export History */}
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>📋 导出历史</Text>
            
            {MOCK_EXPORT_HISTORY.map(item => (
              <View key={item.id} style={styles.historyItem}>
                <View
                  style={[
                    styles.statusDot,
                    item.status === 'completed' && styles.statusCompleted,
                    item.status === 'processing' && styles.statusProcessing,
                    item.status === 'failed' && styles.statusFailed,
                  ]}
                />
                <View style={styles.historyInfo}>
                  <Text style={styles.historyFileName}>{item.fileName}</Text>
                  <Text style={styles.historyMeta}>
                    {item.format} · {item.size} · {item.time}
                  </Text>
                </View>
                {item.status === 'completed' && (
                  <TouchableOpacity style={styles.downloadBtn}>
                    <Text style={styles.downloadBtnText}>下载</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'processing' && (
                  <Text style={styles.processingText}>处理中...</Text>
                )}
                {item.status === 'failed' && (
                  <Text style={styles.failedText}>失败</Text>
                )}
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
  maxWidthContainer: { flex: 1, width: '100%', maxWidth: isWeb ? 700 : 600, alignSelf: 'center' },

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

  content: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 80 },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({ web: { boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }, default: { elevation: 1 } }),
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },

  formatRow: { flexDirection: 'row', gap: 12 },
  formatOption: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: 16,
    alignItems: 'center',
  },
  formatOptionActive: { borderColor: '#007AFF', backgroundColor: '#EFF6FF' },
  formatIcon: { fontSize: 32, marginBottom: 8 },
  formatLabel: { fontSize: 15, fontWeight: '600', color: '#334155', marginBottom: 4 },
  formatLabelActive: { color: '#007AFF' },
  formatDesc: { fontSize: 12, color: '#94A3B8' },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  dateOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  dateChipActive: { backgroundColor: '#007AFF' },
  dateChipText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  dateChipTextActive: { color: '#FFFFFF' },
  customDateRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  dateInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateSeparator: { paddingTop: 14, color: '#94A3B8' },

  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleAllText: { fontSize: 13, color: '#007AFF', fontWeight: '500' },
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '47%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  fieldItemSelected: { borderColor: '#007AFF', backgroundColor: '#EFF6FF' },
  fieldCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D0D5DD',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldCheckboxSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  checkboxCheck: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  fieldLabel: { fontSize: 13, color: '#475569', flex: 1 },
  fieldLabelSelected: { color: '#007AFF', fontWeight: '500' },
  selectedCount: { fontSize: 12, color: '#94A3B8', marginTop: 12, textAlign: 'center' },

  exportButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    ...Platform.select({ web: { boxShadow: '0 4px 12px rgba(0,122,255,0.3)' } }),
  },
  exportButtonDisabled: { backgroundColor: '#93C5FD' },
  exportButtonText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  errorHint: { fontSize: 13, color: '#FF3B30', textAlign: 'center', marginTop: -12, marginBottom: 16 },

  historySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({ web: { boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }, default: { elevation: 1 } }),
  },
  historyTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
    backgroundColor: '#D0D5DD',
  },
  statusCompleted: { backgroundColor: '#34C759' },
  statusProcessing: { backgroundColor: '#FF9500' },
  statusFailed: { backgroundColor: '#FF3B30' },
  historyInfo: { flex: 1 },
  historyFileName: { fontSize: 14, fontWeight: '500', color: '#1A1A1A', marginBottom: 2 },
  historyMeta: { fontSize: 12, color: '#94A3B8' },
  downloadBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  downloadBtnText: { fontSize: 12, fontWeight: '600', color: '#007AFF' },
  processingText: { fontSize: 12, color: '#FF9500', fontWeight: '500' },
  failedText: { fontSize: 12, color: '#FF3B30', fontWeight: '500' },
});

export default AdminRedPacketExportScreen;
