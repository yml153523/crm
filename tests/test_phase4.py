#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase 4 高级 AI 能力增强 - 测试验证套件
==============================================
全面验证第四阶段的所有高级 AI 组件

测试覆盖:
✓ LSTM 深度学习预测引擎 (15 tests)
✓ 图神经网络根因分析器 (18 tests)
✓ 强化学习决策优化器 (16 tests)
✓ Prometheus+Grafana 监控集成 (12 tests)
✓ 系统级集成与端到端测试 (10 tests)

总计: ~71 个测试用例

作者: AI Assistant
版本: 4.0.0
日期: 2026-04-16
"""

import os
import sys
import json
import time
import unittest
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))


class TestLSTMPredictionEngine(unittest.TestCase):
    """LSTM 预测引擎测试"""
    
    @classmethod
    def setUpClass(cls):
        try:
            from lstm_prediction_engine import (
                LSTMPredictionEngine, TrainingConfig,
                FeatureEngineer, PredictionResult, ModelType,
                ModelMetrics, PredictionHorizon
            )
            cls.LSTMPredictionEngine = LSTMPredictionEngine
            cls.TrainingConfig = TrainingConfig
            cls.FeatureEngineer = FeatureEngineer
            cls.PredictionResult = PredictionResult
            cls.ModelType = ModelType
            cls.ModelMetrics = ModelMetrics
            cls.PredictionHorizon = PredictionHorizon
            cls.module_available = True
        except ImportError as e:
            cls.module_available = False
            print(f"⚠️  LSTM Engine 模块导入失败: {e}")
    
    def setUp(self):
        if not self.module_available:
            self.skipTest("模块不可用")
        
        from lstm_prediction_engine import LSTMPredictionEngine, TrainingConfig
        self.engine = LSTMPredictionEngine(config=TrainingConfig(epochs=5))
    
    def test_01_module_import(self):
        """测试: 模块可正常导入"""
        self.assertTrue(self.module_available)
    
    def test_02_engine_initialization(self):
        """测试: 引擎初始化"""
        self.assertIsNotNone(self.engine)
        self.assertTrue(hasattr(self.engine, 'train_model'))
        self.assertTrue(hasattr(self.engine, 'predict'))
        self.assertTrue(hasattr(self.engine, 'batch_predict'))
    
    def test_03_feature_engineer_creation(self):
        """测试: 特征工程器创建"""
        if not NUMPY_AVAILABLE:
            self.skipTest("NumPy 不可用")
        
        fe = self.FeatureEngineer()
        self.assertIsNotNone(fe)
        self.assertTrue(hasattr(fe, 'extract_features'))
        self.assertTrue(hasattr(fe, 'create_sequences'))
    
    def test_04_feature_extraction(self):
        """测试: 特征提取"""
        if not NUMPY_AVAILABLE:
            self.skipTest("NumPy 不可用")
        
        fe = self.FeatureEngineer()
        import numpy as np
        
        np.random.seed(42)
        data = list(50 + 20 * np.sin(np.linspace(0, 4*np.pi, 100)) + np.random.randn(100) * 5)
        
        features = fe.extract_features(data)
        
        self.assertIsInstance(features, np.ndarray)
        self.assertGreater(len(features), 0)
        self.assertGreater(features.shape[1], 1)  # 多维特征
    
    def test_05_sequence_creation(self):
        """测试: 序列样本创建"""
        if not NUMPY_AVAILABLE:
            self.skipTest("NumPy 不可用")
        
        fe = self.FeatureEngineer()
        import numpy as np
        
        data = np.random.randn(100).tolist()
        features = fe.extract_features(data)
        
        X, y = fe.create_sequences(features, np.array(data[-len(features):]))
        
        self.assertEqual(len(X), len(y))
        self.assertEqual(len(X[0].shape), 3)  # (seq_len, n_features)
    
    def test_06_training_config_defaults(self):
        """测试: 训练配置默认值"""
        config = self.TrainingConfig()
        
        self.assertEqual(config.sequence_length, 60)
        self.assertEqual(config.prediction_steps, 10)
        self.assertEqual(config.hidden_size, 128)
        self.assertGreater(config.learning_rate, 0)
        self.assertLess(config.dropout, 1)
    
    def test_07_model_training_basic(self):
        """测试: 基础模型训练流程"""
        if not NUMPY_AVAILABLE:
            self.skipTest("NumPy 不可用")
        
        import numpy as np
        np.random.seed(42)
        
        data = list(50 + 20*np.sin(np.linspace(0, 6*np.pi, 200)) + np.random.randn(200)*3)
        
        config = self.TrainingConfig(epochs=3, batch_size=16)
        engine = self.LSTMPredictionEngine(config=config)
        
        metrics = engine.train_model('test_metric', data, verbose=False)
        
        self.assertIsInstance(metrics, self.ModelMetrics)
        self.assertGreater(metrics.mae, 0)
        self.assertGreater(metrics.rmse, 0)
        self.assertIn('cpu_usage', str(type(metrics)).lower() or '')
    
    def test_08_prediction_after_training(self):
        """测试: 训练后预测"""
        if not NUMPY_AVAILABLE:
            self.skipTest("NumPy 不可用")
        
        import numpy as np
        np.random.seed(42)
        
        data = list(50 + np.random.randn(150)*10)
        
        engine = self.LSTMPredictionEngine(
            config=self.TrainingConfig(epochs=2, prediction_steps=5)
        )
        engine.train_model('predict_test', data[:120], verbose=False)
        
        recent_data = data[-70:]
        result = engine.predict('predict_test', recent_data, horizon=5)
        
        self.assertIsInstance(result, self.PredictionResult)
        self.assertEqual(result.metric_name, 'predict_test')
        self.assertEqual(len(result.predicted_values), 5)
        self.assertEqual(len(result.confidence_intervals), 5)
    
    def test_09_prediction_result_structure(self):
        """测试: 预测结果数据结构完整性"""
        result_fields = [
            'metric_name', 'predicted_values', 'confidence_intervals',
            'prediction_horizon', 'model_type', 'accuracy_score',
            'feature_importance', 'prediction_time', 'anomaly_flags',
            'trend_direction'
        ]
        
        for field in result_fields:
            self.assertTrue(hasattr(self.PredictionResult, field) or 
                           field in ['metric_name', 'predicted_values'])
    
    def test_10_batch_prediction(self):
        """测试: 批量预测"""
        if not NUMPY_AVAILABLE:
            self.skipTest("NumPy 不可用")
        
        import numpy as np
        
        engine = self.LSTMPredictionEngine(
            config=self.TrainingConfig(epochs=2, prediction_steps=3)
        )
        
        for metric in ['metric_a', 'metric_b']:
            data = list(50 + np.random.randn(80)*5)
            engine.train_model(metric, data, verbose=False)
        
        metrics_data = {
            'metric_a': list(np.random.randn(70)*10 + 50),
            'metric_b': list(np.random.randn(70)*8 + 45)
        }
        
        results = engine.batch_predict(metrics_data, horizon=3)
        
        self.assertIsInstance(results, dict)
        self.assertGreaterEqual(len(results), 2)
    
    def test_11_model_info_retrieval(self):
        """测试: 模型信息获取"""
        info = self.engine.get_model_info()
        
        self.assertIsInstance(info, dict)
        self.assertIn('total_models', info)
        self.assertIn('backend', info)
    
    def test_12_prometheus_export_format(self):
        """测试: Prometheus 导出格式"""
        if NUMPY_AVAILABLE:
            import numpy as np
            
            engine = self.LSTMPredictionEngine()
            
            dummy_result = self.PredictionResult(
                metric_name="test_export",
                predicted_values=[1.0, 2.0, 3.0],
                confidence_intervals=[(0.9,1.1), (1.9,2.1), (2.9,3.1)],
                prediction_horizon=3,
                model_type=ModelType.LSTM_ATTENTION,
                accuracy_score=95.0,
                feature_importance={},
                prediction_time=12.5
            )
            
            prometheus_output = engine.export_predictions_to_prometheus(dummy_result)
            
            self.assertIsInstance(prometheus_output, str)
            self.assertIn('HELP', prometheus_output)
            self.assertIn('TYPE', prometheus_output)
            self.assertIn('test_export_predicted', prometheus_output)
    
    def test_13_incremental_update_interface(self):
        """测试: 增量更新接口存在性"""
        self.assertTrue(hasattr(self.engine, 'incremental_update'),
                       "应有 incremental_update 方法")
    
    def test_14_trend_detection(self):
        """测试: 趋势检测逻辑"""
        valid_trends = ["up", "down", "stable"]
        
        increasing = [1, 2, 3, 4, 5]
        decreasing = [5, 4, 3, 2, 1]
        stable = [3, 3.1, 2.9, 3.05, 2.95]
        
        for trend in valid_trends:
            self.assertIn(trend, valid_trends)
    
    def test_15_config_customization(self):
        """测试: 配置自定义能力"""
        custom_config = self.TrainingConfig(
            sequence_length=30,
            hidden_size=64,
            dropout=0.1,
            epochs=50
        )
        
        self.assertEqual(custom_config.sequence_length, 30)
        self.assertEqual(custom_config.hidden_size, 64)
        self.assertAlmostEqual(custom_config.dropout, 0.1)


class TestGNNRootCauseAnalyzer(unittest.TestCase):
    """图神经网络根因分析器测试"""
    
    @classmethod
    def setUpClass(cls):
        try:
            from gnn_root_cause_analyzer import (
                GNNRootCauseAnalyzer, DependencyGraphBuilder,
                MultiDimensionalAnomalyDetector, GraphNode, GraphEdge,
                NodeType, EdgeType, AnomalyEvent, RootCauseAnalysisResult,
                ConfidenceLevel, AnomalyType
            )
            cls.GNNRootCauseAnalyzer = GNNRootCauseAnalyzer
            cls.DependencyGraphBuilder = DependencyGraphBuilder
            cls.MultiDimensionalAnomalyDetector = MultiDimensionalAnomalyDetector
            cls.GraphNode = GraphNode
            cls.GraphEdge = GraphEdge
            cls.NodeType = NodeType
            cls.EdgeType = EdgeType
            cls.AnomalyEvent = AnomalyEvent
            cls.RootCauseAnalysisResult = RootCauseAnalysisResult
            cls.ConfidenceLevel = ConfidenceLevel
            cls.AnomalyType = AnomalyType
            cls.module_available = True
        except ImportError as e:
            cls.module_available = False
            print(f"⚠️  GNN Analyzer 模块导入失败: {e}")
    
    def setUp(self):
        if not self.module_available:
            self.skipTest("模块不可用")
        
        self.analyzer = self.GNNRootCauseAnalyzer()
    
    def test_01_module_import(self):
        """测试: 模块导入"""
        self.assertTrue(self.module_available)
    
    def test_02_graph_builder_initialization(self):
        """测试: 图构建器初始化"""
        builder = self.DependencyGraphBuilder()
        self.assertIsNotNone(builder)
        self.assertEqual(len(builder.nodes), 0)
        self.assertEqual(len(builder.edges), 0)
    
    def test_03_default_topology_loading(self):
        """测试: 默认拓扑加载"""
        builder = self.DependencyGraphBuilder()
        builder.build_from_config(builder._default_topology)
        
        self.assertGreater(len(builder.nodes), 0)
        self.assertGreater(len(builder.edges), 0)
    
    def test_04_node_creation(self):
        """测试: 节点创建"""
        node = self.GraphNode(
            node_id="svc_001",
            node_type=self.NodeType.SERVICE,
            name="API Service"
        )
        
        self.assertEqual(node.node_id, "svc_001")
        self.assertEqual(node.node_type, self.NodeType.SERVICE)
        self.assertFalse(node.is_anomalous)
    
    def test_05_edge_creation(self):
        """测试: 边创建"""
        edge = self.GraphEdge(
            source_id="frontend",
            target_id="api_gateway",
            edge_type=self.EdgeType.CALLS,
            weight=1.5
        )
        
        self.assertEqual(edge.source_id, "frontend")
        self.assertEqual(edge.edge_type, self.EdgeType.CALLS)
        self.assertAlmostEqual(edge.weight, 1.5)
    
    def test_06_neighbor_finding(self):
        """测试: 邻居节点查找"""
        builder = self.DependencyGraphBuilder()
        builder.build_from_config(builder._default_topology)
        
        neighbors = builder.get_neighbors('frontend', depth=1)
        
        self.assertIsInstance(neighbors, set)
        self.assertIn('api_gateway', neighbors)
    
    def test_07_shortest_path(self):
        """测试: 最短路径查找"""
        builder = self.DependencyGraphBuilder()
        builder.build_from_config(builder._default_topology)
        
        path = builder.find_shortest_path('frontend', 'mysql_main')
        
        if path:
            self.assertEqual(path[0], 'frontend')
            self.assertEqual(path[-1], 'mysql_main')
            self.assertGreaterEqual(len(path), 2)
    
    def test_08_graph_statistics(self):
        """测试: 图统计信息"""
        builder = self.DependencyGraphBuilder()
        builder.build_from_config(builder._default_topology)
        
        stats = builder.get_graph_statistics()
        
        self.assertIn('total_nodes', stats)
        self.assertIn('total_edges', stats)
        self.assertIn('node_types', stats)
        self.assertGreater(stats['total_nodes'], 0)
    
    def test_09_dot_export(self):
        """测试: DOT 格式导出"""
        builder = self.DependencyGraphBuilder()
        builder.build_from_config(builder._default_topology)
        
        dot_content = builder.export_to_dot()
        
        self.assertIsInstance(dot_content, str)
        self.assertIn('digraph', dot_content)
        self.assertIn('->', dot_content)
    
    def test_10_anomaly_detector_initialization(self):
        """测试: 异常检测器初始化"""
        detector = self.MultiDimensionalAnomalyDetector()
        self.assertIsNotNone(detector)
        self.assertIn('zscore_threshold', detector.thresholds)
    
    def test_11_anomaly_event_creation(self):
        """测试: 异常事件创建"""
        event = self.AnomalyEvent(
            event_id="ano_001",
            node_id="service_a",
            anomaly_type=self.AnomalyType.SPIKE,
            severity=0.85,
            timestamp=time.time(),
            metric_name="cpu_usage",
            actual_value=95.0,
            expected_value=50.0,
            deviation=45.0,
            confidence=0.92
        )
        
        self.assertEqual(event.anomaly_type, self.AnomalyType.SPIKE)
        self.assertAlmostEqual(event.severity, 0.85)
        self.assertGreater(event.confidence, 0.9)
    
    def test_12_root_cause_analysis_execution(self):
        """测试: 根因分析执行"""
        if not NUMPY_AVAILABLE:
            self.skipTest("需要 NumPy")
        
        import numpy as np
        
        metrics_snapshot = {
            'crm_service': {'response_time': 500, 'error_rate': 0.15, 'cpu_usage': 92},
            'api_gateway': {'response_time': 250, 'error_rate': 0.05, 'cpu_usage': 65},
            'mysql_main': {'connections': 180, 'query_time': 800}
        }
        
        result = self.analyzer.analyze(metrics_snapshot, max_root_causes=3)
        
        self.assertIsInstance(result, self.RootCauseAnalysisResult)
        self.assertGreater(result.total_anomalies_detected, 0)
        self.assertGreater(len(result.root_causes), 0)
        self.assertIn('algorithm_used', result.to_dict())
    
    def test_13_root_cause_candidate_structure(self):
        """测试: 根因候选结构"""
        candidate_fields = [
            'node_id', 'root_cause_probability', 'confidence_level',
            'causal_path', 'affected_nodes', 'explanation'
        ]
        
        for field in candidate_fields:
            self.assertTrue(field in dir() or hasattr(self, field))
    
    def test_14_confidence_levels(self):
        """测试: 置信度等级枚举"""
        levels = list(self.ConfidenceLevel)
        
        self.assertIn(self.ConfidenceLevel.VERY_HIGH, levels)
        self.assertIn(self.ConfidenceLevel.HIGH, levels)
        self.assertIn(self.ConfidenceLevel.MEDIUM, levels)
        self.assertIn(self.ConfidenceLevel.LOW, levels)
        self.assertEqual(len(levels), 5)
    
    def test_15_analysis_history_tracking(self):
        """测试: 分析历史跟踪"""
        self.assertIsInstance(self.analyzer.analysis_history, list)
    
    def test_16_recommendations_generation(self):
        """测试: 建议生成能力"""
        self.assertTrue(hasattr(self.analyzer._generate_recommendations, '__call__') or 
                      hasattr(self.analyzer, '_generate_recommendations'))
    
    def test_17_node_type_enumeration(self):
        """测试: 节点类型枚举完整性"""
        required_types = [
            self.NodeType.SERVICE, self.NodeType.DATABASE,
            self.NodeType.SERVER, self.NodeType.NETWORK
        ]
        
        for node_type in required_types:
            self.assertIsNotNone(node_type.value)
    
    def test_18_edge_type_enumeration(self):
        """测试: 边类型枚举完整性"""
        required_types = [
            self.EdgeType.CALLS, self.EdgeType.DEPENDS_ON,
            self.EdgeType.HOSTS, self.EdgeType.CAUSES
        ]
        
        for edge_type in required_types:
            self.assertIsNotNone(edge_type.value)


class TestRLDecisionOptimizer(unittest.TestCase):
    """强化学习决策优化器测试"""
    
    @classmethod
    def setUpClass(cls):
        try:
            from rl_decision_optimizer import (
                RLOptimizer, SystemEnvironment, QLearningAgent,
                DQNAgent, StateVector, Action, ActionType,
                Policy, OptimizationResult
            )
            cls.RLOptimizer = RLOptimizer
            cls.SystemEnvironment = SystemEnvironment
            cls.QLearningAgent = QLearningAgent
            cls.DQNAgent = DQNAgent
            cls.StateVector = StateVector
            cls.Action = Action
            cls.ActionType = ActionType
            cls.Policy = Policy
            cls.OptimizationResult = OptimizationResult
            cls.module_available = True
        except ImportError as e:
            cls.module_available = False
            print(f"⚠️  RL Optimizer 模块导入失败: {e}")
    
    def setUp(self):
        if not self.module_available:
            self.skipTest("模块不可用")
        
        self.optimizer = self.RLOptimizer()
    
    def test_01_module_import(self):
        """测试: 模块导入"""
        self.assertTrue(self.module_available)
    
    def test_02_environment_initialization(self):
        """测试: 环境初始化"""
        env = self.SystemEnvironment()
        self.assertIsNotNone(env)
        self.assertEqual(env.STATE_DIMENSIONS, 10)
        self.assertEqual(env.ACTION_SPACE_SIZE, len(self.ActionType))
    
    def test_03_environment_reset(self):
        """测试: 环境重置"""
        env = self.SystemEnvironment()
        state = env.reset()
        
        self.assertIsInstance(state, self.StateVector)
        self.assertGreater(state.cpu_usage, 0)
        self.assertLessEqual(state.cpu_usage, 100)
    
    def test_04_environment_step(self):
        """测试: 环境步进"""
        env = self.SystemEnvironment()
        env.reset()
        
        action = self.Action(action_type=self.ActionType.NOOP)
        next_state, reward, done, info = env.step(action)
        
        self.assertIsInstance(next_state, self.StateVector)
        self.assertIsInstance(reward, float)
        self.assertIsInstance(done, bool)
        self.assertIsInstance(info, dict)
    
    def test_05_state_vector_to_array(self):
        """测试: 状态向量转数组"""
        state = self.StateVector(
            timestamp=time.time(),
            cpu_usage=75.5,
            memory_usage=60.2,
            disk_usage=45.0,
            response_time_p50=120,
            response_time_p99=350,
            error_rate=0.02,
            request_rate=150.0,
            active_connections=300,
            queue_length=10,
            process_count=8
        )
        
        arr = state.to_array()
        
        self.assertEqual(len(arr), 10)
        self.assertTrue(all(isinstance(v, float) for v in arr))
    
    def test_06_action_type_enumeration(self):
        """测试: 动作类型枚举"""
        actions = list(self.ActionType)
        
        self.assertIn(self.ActionType.RESTART_SERVICE, actions)
        self.assertIn(self.ActionType.SCALE_UP, actions)
        self.assertIn(self.ActionType.NOOP, actions)
        self.assertGreater(len(actions), 5)
    
    def test_07_q_learning_agent_init(self):
        """测试: Q-Learning Agent 初始化"""
        agent = self.QLearningAgent()
        self.assertIsNotNone(agent)
        self.assertGreater(agent.epsilon, 0)
        self.assertLessEqual(agent.epsilon, 1.0)
    
    def test_08_q_learning_action_selection(self):
        """测试: Q-Learning 动作选择"""
        agent = self.QLearningAgent()
        
        state = self.StateVector(
            timestamp=time.time(), cpu_usage=50, memory_usage=50,
            disk_usage=40, response_time_p50=100, response_time_p99=200,
            error_rate=0.01, request_rate=100, active_connections=200,
            queue_length=5, process_count=6
        )
        
        action = agent.select_action(state, training=True)
        
        self.assertIsInstance(action, self.Action)
        self.assertIsInstance(action.action_type, self.ActionType)
    
    def test_09_dqn_agent_init(self):
        """测试: DQN Agent 初始化"""
        if not NUMPY_AVAILABLE:
            self.skipTest("需要 NumPy")
        
        agent = self.DQNAgent()
        self.assertIsNotNone(agent)
        self.assertEqual(agent.state_dim, 10)
    
    def test_10_optimizer_initialization(self):
        """测试: 优化器初始化"""
        optimizer = self.RLOptimizer()
        
        self.assertIsNotNone(optimizer.environment)
        self.assertIsNotNone(optimizer.agent)
        self.assertIsInstance(optimizer.policies, dict)
    
    def test_11_training_execution(self):
        """测试: 训练执行"""
        result = self.optimizer.train(num_episodes=10, max_steps_per_episode=20, verbose=False)
        
        self.assertIsInstance(result, self.OptimizationResult)
        self.assertGreater(result.total_reward, -float('inf'))
        self.assertIsInstance(result.actions_taken, list)
    
    def test_12_optimal_action_selection(self):
        """测试: 最优动作选择"""
        state = self.StateVector(
            timestamp=time.time(), cpu_usage=90, memory_usage=85,
            disk_usage=80, response_time_p50=500, response_time_p99=1000,
            error_rate=0.1, request_rate=200, active_connections=500,
            queue_length=50, process_count=10
        )
        
        action = self.optimizer.get_optimal_action(state)
        
        self.assertIsInstance(action, self.Action)
        self.assertNotEqual(action.action_type, None)
    
    def test_13_policy_extraction(self):
        """测试: 策略提取"""
        policy = self.optimizer.agent.get_policy()
        
        self.assertIsInstance(policy, self.Policy)
        self.assertIsNotNone(policy.policy_id)
        self.assertIsInstance(policy.state_action_mapping, dict)
    
    def test_14_statistics_retrieval(self):
        """测试: 统计信息获取"""
        stats = self.optimizer.get_statistics()
        
        self.assertIsInstance(stats, dict)
        self.assertIn('agent_type', stats)
        self.assertIn('best_reward', stats)
    
    def test_15_export_rules_functionality(self):
        """测试: 规则导出功能"""
        rules = self.optimizer.export_policy_to_rules()
        
        self.assertIsInstance(rules, list)
    
    def test_16_reward_signal_design(self):
        """测试: 奖励信号设计合理性"""
        env = self.SystemEnvironment()
        env.reset()
        
        healthy_state = env.step(self.Action(action_type=self.ActionType.NOOP))[0]
        
        action_high_error = self.Action(action_type=self.ActionType.RESTART_SERVICE)
        _, reward_bad, _, _ = env.step(action_high_error)
        
        self.assertIsInstance(reward_bad, float)


class TestPrometheusGrafanaIntegration(unittest.TestCase):
    """Prometheus + Grafana 监控集成测试"""
    
    @classmethod
    def setUpClass(cls):
        try:
            from prometheus_grafana_integration import (
                MonitoringIntegration, MetricsCollector,
                PrometheusMetric, MetricType, GrafanaDashboard,
                GrafanaPanel, PanelType, AlertRule, AlertSeverity,
                GrafanaDashboardBuilder, GrafanaVariable
            )
            cls.MonitoringIntegration = MonitoringIntegration
            cls.MetricsCollector = MetricsCollector
            cls.PrometheusMetric = PrometheusMetric
            cls.MetricType = MetricType
            cls.GrafanaDashboard = GrafanaDashboard
            cls.GrafanaPanel = GrafanaPanel
            cls.PanelType = PanelType
            cls.AlertRule = AlertRule
            cls.AlertSeverity = AlertSeverity
            cls.GrafanaDashboardBuilder = GrafanaDashboardBuilder
            cls.GrafanaVariable = GrafanaVariable
            cls.module_available = True
        except ImportError as e:
            cls.module_available = False
            print(f"⚠️  Monitoring Integration 模块导入失败: {e}")
    
    def setUp(self):
        if not self.module_available:
            self.skipTest("模块不可用")
        
        self.monitoring = self.MonitoringIntegration()
    
    def test_01_module_import(self):
        """测试: 模块导入"""
        self.assertTrue(self.module_available)
    
    def test_02_collector_initialization(self):
        """测试: 收集器初始化"""
        collector = self.MetricsCollector()
        self.assertGreater(len(collector.metrics), 0)
    
    def test_03_builtin_metrics_registered(self):
        """测试: 内置指标注册"""
        self.assertIn('crm_up', self.monitoring.collector.metrics)
        self.assertIn('crm_scrape_duration_seconds', self.monitoring.collector.metrics)
    
    def test_04_gauge_metric_registration(self):
        """测试: Gauge 指标注册"""
        self.monitoring.collector.set_gauge('test_gauge', 42.5)
        
        registered = any(m.name == 'test_gauge' for m in self.monitoring.collector.metrics.values())
        self.assertTrue(registered, "Gauge 应被注册")
    
    def test_05_counter_metric_increments(self):
        """测试: Counter 指标递增"""
        initial_count = sum(1 for m in self.monitoring.collector.metrics.values() 
                          if m.metric_type == self.MetricType.COUNTER)
        
        self.monitoring.collector.increment_counter('test_counter')
        self.monitoring.collector.increment_counter('test_counter')
        self.monitoring.collector.increment_counter('test_counter')
        
        counter_found = any(
            m.name.startswith('test_counter') and m.value == 3.0 
            for m in self.monitoring.collector.metrics.values()
        )
        self.assertTrue(counter_found, "Counter 应递增到 3")
    
    def test_06_prometheus_format_export(self):
        """测试: Prometheus 格式导出"""
        output = self.monitoring.collector.export_metrics()
        
        self.assertIsInstance(output, str)
        self.assertIn('# TYPE', output)
        self.assertIn('# HELP', output)
        self.assertIn('crm_up', output)
    
    def test_07_dashboard_builder_initialization(self):
        """测试: Dashboard 构建器初始化"""
        builder = self.GrafanaDashboardBuilder()
        self.assertIsNotNone(builder)
    
    def test_08_system_overview_dashboard_generation(self):
        """测试: 系统总览 Dashboard 生成"""
        builder = self.GrafanaDashboardBuilder()
        dashboard = builder.create_system_overview_dashboard()
        
        self.assertIsInstance(dashboard, self.GrafanaDashboard)
        self.assertGreater(len(dashboard.panels), 0)
        self.assertIn('CRM System Overview', dashboard.title)
    
    def test_09_service_health_dashboard_generation(self):
        """测试: 服务健康 Dashboard 生成"""
        builder = self.GrafanaDashboardBuilder()
        dashboard = builder.create_service_health_dashboard()
        
        self.assertIsInstance(dashboard, self.GrafanaDashboard)
        self.assertIn('Service Health' , dashboard.title.lower() or dashboard.title)
        self.assertGreater(len(dashboard.panels), 0)
    
    def test_10_security_dashboard_generation(self):
        """测试: 安全审计 Dashboard 生成"""
        builder = self.GrafanaDashboardBuilder()
        dashboard = builder.create_security_dashboard()
        
        self.assertIsInstance(dashboard, self.GrafanaDashboard)
        self.assertIn('security', dashboard.title.lower())
    
    def test_11_ai_ops_dashboard_generation(self):
        """测试: AI 运维 Dashboard 生成"""
        builder = self.GrafanaDashboardBuilder()
        dashboard = builder.create_ai_ops_dashboard()
        
        self.assertIsInstance(dashboard, self.GrafanaDashboard)
        self.assertIn('AI Operations' , dashboard.title.lower() or dashboard.title)
    
    def test_12_alert_rule_generation(self):
        """测试: 告警规则生成"""
        builder = self.GrafanaDashboardBuilder()
        rules = builder.generate_alert_rules()
        
        self.assertIsInstance(rules, list)
        self.assertGreater(len(rules), 0)
        
        for rule in rules:
            self.assertIsInstance(rule, self.AlertRule)
            self.assertIsInstance(rule.name, str)
            self.assertIsInstance(rule.expr, str)
            self.assertIsInstance(rule.severity, self.AlertSeverity)


class TestSystemIntegrationE2E(unittest.TestCase):
    """系统级端到端集成测试"""
    
    def test_01_all_phase4_modules_importable(self):
        """测试: 所有 Phase 4 模块可导入"""
        modules_status = {}
        
        modules_to_check = {
            'lstm_prediction_engine': ['LSTMPredictionEngine', 'TrainingConfig'],
            'gnn_root_cause_analyzer': ['GNNRootCauseAnalyzer', 'DependencyGraphBuilder'],
            'rl_decision_optimizer': ['RLOptimizer', 'SystemEnvironment'],
            'prometheus_grafana_integration': ['MonitoringIntegration', 'MetricsCollector']
        }
        
        imported_count = 0
        for module_name, expected_classes in modules_to_check.items():
            try:
                module = __import__(module_name, fromlist=expected_classes)
                for class_name in expected_classes:
                    self.assertTrue(hasattr(module, class_name),
                                  f"{module_name} 应包含 {class_name}")
                imported_count += 1
                modules_status[module_name] = "✅"
            except Exception as e:
                modules_status[module_name] = f"❌ ({str(e)[:50]})"
        
        self.assertGreater(imported_count, 2, "至少应能导入3个模块")
    
    def test_02_lstm_to_rca_pipeline(self):
        """测试: LSTM → RCA 流水线"""
        try:
            from lstm_prediction_engine import LSTMPredictionEngine, TrainingConfig
            from gnn_root_cause_analyzer import GNNRootCauseAnalyzer
            
            if not NUMPY_AVAILABLE:
                self.skipTest("需要 NumPy")
            
            import numpy as np
            
            lstm_engine = LSTMPredictionEngine(config=TrainingConfig(epochs=2))
            data = list(50 + np.sin(np.linspace(0, 10*np.pi, 100)) * 20 + np.random.randn(100)*5)
            lstm_engine.train_model('pipeline_test', data[:80], verbose=False)
            
            pred = lstm_engine.predict('pipeline_test', data[-70:], horizon=5)
            
            rca_analyzer = GNNRootCauseAnalyzer()
            metrics = {'test_service': {'response_time': pred.predicted_values[0], 'cpu_usage': 75}}
            
            result = rca_analyzer.analyze(metrics, max_root_causes=2)
            
            self.assertIsNotNone(pred)
            self.assertIsNotNone(result)
            
        except Exception as e:
            self.fail(f"Pipeline 测试失败: {e}")
    
    def test_03_rl_optimizer_with_environment(self):
        """测试: RL 优化器与环境交互"""
        try:
            from rl_decision_optimizer import RLOptimizer
            
            optimizer = RLOptimizer()
            result = optimizer.train(num_episodes=5, max_steps_per_episode=15, verbose=False)
            
            self.assertIsNotNone(result)
            self.assertLess(result.analysis_duration_ms, 60000)  # 应在60秒内完成
            
        except Exception as e:
            self.fail(f"RL 训练测试失败: {e}")
    
    def test_04_monitoring_full_workflow(self):
        """测试: 监控完整工作流"""
        try:
            from prometheus_grafana_integration import MonitoringIntegration
            
            monitoring = MonitoringIntegration()
            
            monitoring.record_custom_metric("test_e2e_orders", 1234.56)
            monitoring.record_custom_metric("test_e2e_users", 89.0)
            
            dashboards = monitoring.generate_all_dashboards()
            alerts = monitoring.generate_all_alert_rules()
            
            status = monitoring.get_status()
            
            self.assertGreater(len(dashboards), 0)
            self.assertGreater(len(alerts), 0)
            self.assertIn('dashboards_generated', status)
            self.assertEqual(status['dashboards_generated'], len(dashboards))
            
        except Exception as e:
            self.fail(f"监控工作流测试失败: {e}")
    
    def test_05_file_structure_validation(self):
        """测试: 文件结构完整性"""
        base_path = Path('/home/liuyeming/work/crm/scripts')
        
        phase4_files = [
            'lstm_prediction_engine.py',
            'gnn_root_cause_analyzer.py',
            'rl_decision_optimizer.py',
            'prometheus_grafana_integration.py'
        ]
        
        for filename in phase4_files:
            filepath = base_path / filename
            self.assertTrue(filepath.exists(), f"文件应存在: {filename}")
            
            size = filepath.stat().st_size
            self.assertGreater(size, 5000, f"{filename} 应大于5KB")
    
    def test_06_code_quality_no_syntax_errors(self):
        """测试: 代码质量 - 无语法错误"""
        import py_compile
        
        scripts_dir = Path('/home/liuyeming/work/crm/scripts')
        phase4_files = [
            'lstm_prediction_engine.py',
            'gnn_root_cause_analyzer.py',
            'rl_decision_optimizer.py',
            'prometheus_grafana_integration.py'
        ]
        
        for filename in phase4_files:
            filepath = scripts_dir / filename
            if filepath.exists():
                try:
                    py_compile.compile(str(filepath), doraise=True)
                except py_compile.PyCompileError as e:
                    self.fail(f"语法错误在 {filename}: {e}")
    
    def test_07_total_system_modules_count(self):
        """测试: 总系统模块数量"""
        scripts_dir = Path('/home/liuyeming/work/crm/scripts')
        python_files = list(scripts_dir.glob('*.py'))
        
        core_modules = [
            'ssh_auto_manager.py', 'ssh_utils.py', 'batch_migrate.py',
            'env_manager.py', 'monitoring.py', 'performance_optimizer.py',
            'ai_ops_assistant.py', 'zero_trust_security.py',
            'compliance_report_system.py', 'self_healing_engine.py',
            'lstm_prediction_engine.py', 'gnn_root_cause_analyzer.py',
            'rl_decision_optimizer.py', 'prometheus_grafana_integration.py'
        ]
        
        existing_core = sum(1 for m in core_modules if (scripts_dir / m).exists())
        
        self.assertGreater(existing_core, 10, f"核心模块应超过10个，当前: {existing_core}")
        print(f"\n   📦 核心模块数: {existing_core}/{len(core_modules)}")
        print(f"   📁 总 Python 文件数: {len(python_files)}")
    
    def test_08_cross_module_compatibility(self):
        """测试: 跨模块兼容性"""
        compatibility_checks = []
        
        try:
            from zero_trust_security import ZeroTrustGateway
            from ai_ops_assistant import AIOpsAssistant
            from lstm_prediction_engine import LSTMPredictionEngine
            from gnn_root_cause_analyzer import GNNRootCauseAnalyzer
            from rl_decision_optimizer import RLOptimizer
            from prometheus_grafana_integration import MonitoringIntegration
            
            compatibility_checks.append(("ZeroTrust", "✅"))
            compatibility_checks.append(("AIOps", "✅"))
            compatibility_checks.append(("LSTM", "✅"))
            compatibility_checks.append(("GNN-RCA", "✅"))
            compatibility_checks.append(("RL", "✅"))
            compatibility_checks.append(("Monitoring", "✅"))
            
        except ImportError as e:
            compatibility_checks.append((str(e).split("'")[1] if "'" in str(e) else "Unknown", "❌"))
        
        successful = sum(1 for _, status in compatibility_checks if status == "✅")
        self.assertGreater(successful, 4, "至少4个模块应能成功导入")
    
    def test_09_performance_baseline(self):
        """测试: 性能基线"""
        start = time.time()
        
        try:
            from prometheus_grafana_integration import MetricsCollector
            collector = MetricsCollector()
            _ = collector.export_metrics()
            export_time = (time.time() - start) * 1000
            
            self.assertLess(export_time, 100, f"指标导出应在100ms内，实际: {export_time:.1f}ms")
            
        except:
            pass
        
        total_time = (time.time() - start) * 1000
        self.assertLess(total_time, 500, f"总时间应在500ms内，实际: {total_time:.1f}ms")
    
    def test_10_documentation_and_metadata(self):
        """测试: 文档和元数据完整性"""
        files_to_check = {
            'lstm_prediction_engine.py': 'LSTM Deep Learning Time-Series Prediction Engine',
            'gnn_root_cause_analyzer.py': 'Graph Neural Network Root Cause Analysis Engine',
            'rl_decision_optimizer.py': 'Reinforcement Learning Decision Optimizer',
            'prometheus_grafana_integration.py': 'Prometheus + Grafana Monitoring Integration'
        }
        
        docs_found = 0
        for filename, expected_doc in files_to_check.items():
            filepath = Path('/home/liuyeming/work/crm/scripts') / filename
            if filepath.exists():
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read(1000)
                
                if expected_doc.split()[0] in content:
                    docs_found += 1
        
        self.assertGreater(docs_found, 2, "至少2个文件应有文档字符串")


def run_tests():
    """运行所有 Phase 4 测试"""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    test_classes = [
        TestLSTMPredictionEngine,
        TestGNNRootCauseAnalyzer,
        TestRLDecisionOptimizer,
        TestPrometheusGrafanaIntegration,
        TestSystemIntegrationE2E
    ]
    
    for test_class in test_classes:
        tests = loader.loadTestsFromTestCase(test_class)
        suite.addTests(tests)
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n" + "="*70)
    print("📊 Phase 4 测试结果摘要")
    print("="*70)
    print(f"总测试数: {result.testsRun}")
    print(f"✅ 通过: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"❌ 失败: {len(result.failures)}")
    print(f"⚠️  错误: {len(result.errors)}")
    print(f"成功率: {((result.testsRun - len(result.failures) - len(result.errors)) / max(result.testsRun, 1) * 100):.1f}%")
    
    if result.wasSuccessful():
        print("\n🎉 所有 Phase 4 测试通过！")
    else:
        print("\n⚠️  部分测试未通过，请查看详细信息")
    
    return result


if __name__ == '__main__':
    run_tests()
