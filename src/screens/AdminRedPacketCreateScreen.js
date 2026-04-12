import React, { useState } from 'react';
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

const STEPS = ['基本信息', '触发规则', '领取限制', '发布确认'];

const AdminRedPacketCreateScreen = ({ navigation, route }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'random',
    totalAmount: '',
    totalCount: '',
    minAmount: '',
    validityType: '7d',
    validityDays: 7,
    triggerType: 'watch_video',
    requiredDuration: '',
    maxClaimsPerUser: 1,
    dailyLimit: 3,
    weeklyLimit: 10,
    monthlyLimit: 30,
    vipOnly: false,
    levelRestrictionEnabled: false,
    notificationChannels: [],
    displayStyle: 'standard',
  });

  const [errors, setErrors] = useState({});

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 0) {
      if (!formData.title.trim()) newErrors.title = '请输入红包名称';
      if (formData.title.length > 50) newErrors.title = '名称不能超过50个字符';
      if (!formData.totalAmount || formData.totalAmount <= 0) newErrors.totalAmount = '请输入有效金额';
      if (formData.totalAmount > 10000000) newErrors.totalAmount = '金额不能超过100000元';
      if (!formData.totalCount || formData.totalCount < 1) newErrors.totalCount = '请输入有效数量';
      if (formData.totalCount > 10000) newErrors.totalCount = '数量不能超过10000';
    }
    
    if (step === 1) {
      if (formData.triggerType === 'watch_video') {
        const duration = Number(formData.requiredDuration);
        if (!duration || duration < 1 || duration > 480) {
          newErrors.requiredDuration = '时长必须在1-480分钟之间';
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handlePublish();
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSaveDraft = () => {
    alert('草稿已保存！');
  };

  const handlePublish = () => {
    alert('红包活动已发布！\n\n' + JSON.stringify(formData, null, 2));
    navigation.goBack();
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEPS.map((step, index) => (
        <React.Fragment key={index}>
          <TouchableOpacity
            style={[
              styles.stepCircle,
              index === currentStep && styles.stepCircleActive,
              index < currentStep && styles.stepCircleCompleted,
            ]}
            onPress={() => index < currentStep && setCurrentStep(index)}
          >
            <Text
              style={[
                styles.stepNumber,
                index <= currentStep && styles.stepNumberActive,
              ]}
            >
              {index < currentStep ? '✓' : index + 1}
            </Text>
          </TouchableOpacity>
          {index < STEPS.length - 1 && (
            <View
              style={[
                styles.stepLine,
                index < currentStep && styles.stepLineCompleted,
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  const renderBasicInfo = () => (
    <ScrollView style={styles.formSection} showsVerticalScrollIndicator={false}>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>红包标题 *</Text>
        <TextInput
          style={[styles.input, errors.title && styles.inputError]}
          placeholder="请输入红包名称（1-50字符）"
          value={formData.title}
          onChangeText={(v) => updateField('title', v)}
          maxLength={50}
        />
        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>描述</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="请输入红包描述（可选）"
          value={formData.description}
          onChangeText={(v) => updateField('description', v)}
          multiline
          numberOfLines={3}
          maxLength={500}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.fieldGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={styles.label}>红包类型</Text>
          <View style={styles.typeSelector}>
            {['fixed', 'random'].map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeOption,
                  formData.type === type && styles.typeOptionActive,
                ]}
                onPress={() => updateField('type', type)}
              >
                <Text
                  style={[
                    styles.typeText,
                    formData.type === type && styles.typeTextActive,
                  ]}
                >
                  {type === 'fixed' ? '固定金额' : '随机金额'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.fieldGroup, { flex: 1, marginRight: 10 }]}>
          <Text style={styles.label}>总金额（元）*</Text>
          <TextInput
            style={[styles.input, errors.totalAmount && styles.inputError]}
            placeholder="如：1000"
            value={formData.totalAmount}
            onChangeText={(v) => updateField('totalAmount', v)}
            keyboardType="numeric"
          />
          {errors.totalAmount && <Text style={styles.errorText}>{errors.totalAmount}</Text>}
        </View>

        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={styles.label}>红包个数 *</Text>
          <TextInput
            style={[styles.input, errors.totalCount && styles.inputError]}
            placeholder="如：100"
            value={formData.totalCount}
            onChangeText={(v) => updateField('totalCount', v)}
            keyboardType="numeric"
          />
          {errors.totalCount && <Text style={styles.errorText}>{errors.totalCount}</Text>}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>最小金额（元，仅随机模式）</Text>
        <TextInput
          style={styles.input}
          placeholder="默认 0.01 元"
          value={formData.minAmount}
          onChangeText={(v) => updateField('minAmount', v)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>有效期</Text>
        <View style={styles.validitySelector}>
          {[
            { value: '24h', label: '24小时' },
            { value: '7d', label: '7天' },
            { value: '30d', label: '30天' },
            { value: 'custom', label: '自定义' },
          ].map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.validityOption,
                formData.validityType === option.value && styles.validityOptionActive,
              ]}
              onPress={() => updateField('validityType', option.value)}
            >
              <Text
                style={[
                  styles.validityText,
                  formData.validityType === option.value && styles.validityTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderTriggerRules = () => (
    <ScrollView style={styles.formSection} showsVerticalScrollIndicator={false}>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>触发条件类型 *</Text>
        <View style={styles.triggerTypeGrid}>
          {[
            { value: 'watch_video', icon: '🎬', label: '视频观看' },
            { value: 'complete_task', icon: '✅', label: '完成任务' },
            { value: 'user_level', icon: '👤', label: '用户等级' },
            { value: 'combination', icon: '🔗', label: '组合条件' },
          ].map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.triggerCard,
                formData.triggerType === option.value && styles.triggerCardActive,
              ]}
              onPress={() => updateField('triggerType', option.value)}
            >
              <Text style={styles.triggerIcon}>{option.icon}</Text>
              <Text
                style={[
                  styles.triggerLabel,
                  formData.triggerType === option.value && styles.triggerLabelActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {formData.triggerType === 'watch_video' && (
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>观看时长阈值（分钟）*</Text>
          <TextInput
            style={[styles.input, errors.requiredDuration && styles.inputError]}
            placeholder="请输入 1-480 分钟"
            value={formData.requiredDuration}
            onChangeText={(v) => updateField('requiredDuration', v)}
            keyboardType="numeric"
          />
          {errors.requiredDuration && <Text style={styles.errorText}>{errors.requiredDuration}</Text>}
          <Text style={styles.hintText}>用户观看商品推荐视频达到此时长后可领取红包</Text>
        </View>
      )}

      {formData.triggerType === 'combination' && (
        <View style={styles.combinationHint}>
          <Text style={styles.combinationHintTitle}>组合条件说明</Text>
          <Text style={styles.combinationHintText}>
            支持多条件 AND/OR 逻辑组合，例如：
            {'\n'}• 观看视频 ≥ 30分钟 AND 完成首次购买
            {'\n'}• VIP等级 ≥ 2 OR 邀请好友 ≥ 3人
          </Text>
        </View>
      )}
    </ScrollView>
  );

  const renderClaimLimits = () => (
    <ScrollView style={styles.formSection} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>基础限制</Text>
        
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>每人限领次数</Text>
          <TextInput
            style={styles.input}
            value={String(formData.maxClaimsPerUser)}
            onChangeText={(v) => updateField('maxClaimsPerUser', Number(v))}
            keyboardType="numeric"
          />
          <Text style={styles.hintText}>同一用户对同一红包最多可领取的次数</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>频率限制</Text>
        
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label">每日上限</Text>
            <TextInput
              style={styles.input}
              value={String(formData.dailyLimit)}
              onChange={(v) => updateField('dailyLimit', Number(v))}
              keyboardType="numeric"
            />
          </View>
          
          <View style={[styles.fieldGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>每周上限</Text>
            <TextInput
              style={styles.input}
              value={String(formData.weeklyLimit)}
              onChange={(v) => updateField('weeklyLimit', Number(v))}
              keyboardType="numeric"
            />
          </View>
          
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>每月上限</Text>
            <TextInput
              style={styles.input}
              value={String(formData.monthlyLimit)}
              onChange={(v) => updateField('monthlyLimit', Number(v))}
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>用户等级限制</Text>
        
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>启用等级限制</Text>
          <TouchableOpacity
            style={[styles.switch, formData.levelRestrictionEnabled && styles.switchActive]}
            onPress={() => updateField('levelRestrictionEnabled', !formData.levelRestrictionEnabled)}
          >
            <View style={[styles.switchThumb, formData.levelRestrictionEnabled && styles.switchThumbActive]} />
          </TouchableOpacity>
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>仅 VIP 用户可领</Text>
          <TouchableOpacity
            style={[styles.switch, formData.vipOnly && styles.switchActive]}
            onPress={() => updateField('vipOnly', !formData.vipOnly)}
          >
            <View style={[styles.switchThumb, formData.vipOnly && styles.switchThumbActive]} />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderPublishConfirm = () => (
    <ScrollView style={styles.formSection} showsVerticalScrollIndicator={false}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📋 配置摘要</Text>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>红包名称</Text>
          <Text style={styles.summaryValue}>{formData.title || '未填写'}</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>类型</Text>
          <Text style={styles.summaryValue}>{formData.type === 'random' ? '随机金额' : '固定金额'}</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>总金额 / 个数</Text>
          <Text style={styles.summaryValue}>{formData.totalAmount || '-'} 元 / {formData.totalCount || '-'} 个</Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>触发条件</Text>
          <Text style={styles.summaryValue}>
            {formData.triggerType === 'watch_video' ? `观看视频 ≥ ${formData.requiredDuration || '-'} 分钟` : 
             formData.triggerType === 'complete_task' ? '完成任务' :
             formData.triggerType === 'user_level' ? '用户等级达标' : '组合条件'}
          </Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>领取限制</Text>
          <Text style={styles.summaryValue}>
            每人{formData.maxClaimsPerUser}次 · 日限{formData.dailyLimit} · 周限{formData.weeklyLimit} · 月限{formData.monthlyLimit}
            {formData.vipOnly ? ' · 仅VIP' : ''}
          </Text>
        </View>
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>有效期</Text>
          <Text style={styles.summaryValue">
            {formData.validityType === '24h' ? '24小时' :
             formData.validityType === '7d' ? '7天' :
             formData.validityType === '30d' ? '30天' : `${formData.validityDays}天`}
          </Text>
        </View>
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <Text style={styles.warningText}>
          发布后红包将立即生效，系统开始监听用户行为并自动发放。请确认以上配置无误。
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.maxWidthContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>创建红包</Text>
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveDraft}>
            <Text style={styles.saveButtonText}>保存草稿</Text>
          </TouchableOpacity>
        </View>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Form Content */}
        <View style={styles.formContainer}>
          {currentStep === 0 && renderBasicInfo()}
          {currentStep === 1 && renderTriggerRules()}
          {currentStep === 2 && renderClaimLimits()}
          {currentStep === 3 && renderPublishConfirm()}
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.prevButton} onPress={handlePrev}>
              <Text style={styles.prevButtonText}>上一步</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.nextButton, currentStep === STEPS.length - 1 && styles.publishButton]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === STEPS.length - 1 ? '确认发布' : '下一步'}
            </Text>
          </TouchableOpacity>
        </View>
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
  saveButton: { padding: 8 },
  saveButtonText: { fontSize: 14, fontWeight: '500', color: '#007AFF' },

  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: { backgroundColor: '#007AFF' },
  stepCircleCompleted: { backgroundColor: '#34C759' },
  stepNumber: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  stepNumberActive: { color: '#FFFFFF' },
  stepLine: { width: 60, height: 3, backgroundColor: '#E5E7EB' },
  stepLineCompleted: { backgroundColor: '#34C759' },

  formContainer: { flex: 1, paddingHorizontal: 16 },
  formSection: { flex: 1, paddingTop: 16 },
  
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  inputError: { borderColor: '#FF3B30' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  errorText: { fontSize: 12, color: '#FF3B30', marginTop: 4 },
  hintText: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  
  row: { flexDirection: 'row' },
  
  typeSelector: { flexDirection: 'row', gap: 10 },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  typeOptionActive: { backgroundColor: '#007AFF' },
  typeText: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  typeTextActive: { color: '#FFFFFF' },
  
  validitySelector: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  validityOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  validityOptionActive: { backgroundColor: '#007AFF' },
  validityText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  validityTextActive: { color: '#FFFFFF' },

  triggerTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  triggerCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }, default: { elevation: 1 } }),
  },
  triggerCardActive: { backgroundColor: '#EFF6FF', borderWidth: 2, borderColor: '#007AFF' },
  triggerIcon: { fontSize: 32, marginBottom: 8 },
  triggerLabel: { fontSize: 14, fontWeight: '500', color: '#475569' },
  triggerLabelActive: { color: '#007AFF' },

  combinationHint: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  combinationHintTitle: { fontSize: 15, fontWeight: '600', color: '#92400E', marginBottom: 8 },
  combinationHintText: { fontSize: 13, color: '#B45309', lineHeight: 20 },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }, default: { elevation: 1 } }),
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 16 },

  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  toggleLabel: { fontSize: 15, color: '#334155' },
  switch: {
    width: 51,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#D1D5DB',
    padding: 2,
  },
  switchActive: { backgroundColor: '#34C759' },
  switchThumb: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    ...Platform.select({ web: { transition: 'all 0.2s' } }),
  },
  switchThumbActive: { alignSelf: 'flex-end' },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }, default: { elevation: 1 } }),
  },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 20 },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  summaryLabel: { fontSize: 14, color: '#64748B' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', maxWidth: '60%', textAlign: 'right' },

  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  warningIcon: { fontSize: 20, marginRight: 10 },
  warningText: { fontSize: 13, color: '#92400E', flex: 1, lineHeight: 20 },

  bottomActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
  },
  prevButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  prevButtonText: { fontSize: 15, fontWeight: '600', color: '#475569' },
  nextButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  publishButton: { backgroundColor: '#34C759' },
  nextButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

export default AdminRedPacketCreateScreen;
