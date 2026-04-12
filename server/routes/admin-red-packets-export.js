const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const ExportService = require('../services/ExportService');
const fs = require('fs');
const path = require('path');

router.post('/', [
  body('format').isIn(['excel', 'pdf']).withMessage('导出格式必须是 excel 或 pdf'),
  body('redPacketIds').optional().isArray().withMessage('红包ID列表必须是数组'),
  body('dateRange').optional().isObject(),
  body('fields').optional().isArray(),
  body('includeCharts').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '参数验证失败',
        errors: errors.array()
      });
    }

    const adminId = req.user?.id || 'system';
    const config = {
      format: req.body.format,
      redPacketIds: req.body.redPacketIds || [],
      dateRange: req.body.dateRange || {},
      fields: req.body.fields || [],
      includeCharts: req.body.includeCharts || false
    };

    const exportTask = await ExportService.createExportTask(adminId, config);

    setImmediate(async () => {
      try {
        await ExportService.processExport(exportTask);
      } catch (error) {
        console.error('异步导出任务执行失败:', error);
      }
    });

    res.status(202).json({
      success: true,
      message: '导出任务已创建，请通过进度接口查询状态',
      data: {
        taskId: exportTask.taskId,
        status: exportTask.status
      }
    });
  } catch (error) {
    console.error('创建导出任务失败:', error);
    res.status(500).json({
      success: false,
      message: '创建导出任务失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/progress/:taskId', [
  query('taskId').notEmpty().withMessage('任务ID不能为空')
], async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await ExportService.getExportProgress(taskId);

    res.json({
      success: true,
      data: {
        taskId: task.taskId,
        status: task.status,
        progress: task.progress,
        result: task.status === 'completed' ? {
          fileName: task.result.fileName,
          fileSize: task.result.fileSize,
          recordCount: task.result.recordCount,
          generatedAt: task.result.generatedAt,
          downloadUrl: `/api/admin/red-packets/export/download/${task.taskId}`
        } : null,
        error: task.status === 'failed' ? task.result.error : null,
        createdAt: task.createdAt,
        expiresAt: task.expiresAt
      }
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message || '查询导出进度失败'
    });
  }
});

router.get('/download/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await ExportService.getExportProgress(taskId);

    if (task.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `导出任务尚未完成，当前状态: ${task.status}`
      });
    }

    if (!task.result || !task.result.filePath) {
      return res.status(404).json({
        success: false,
        message: '导出文件不存在'
      });
    }

    const filePath = path.resolve(task.result.filePath);

    try {
      await fs.access(filePath);
    } catch (err) {
      return res.status(404).json({
        success: false,
        message: '导出文件已被删除或不存在'
      });
    }

    const fileName = task.result.fileName || `export_${taskId}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);

    if (task.config.format === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else if (task.config.format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
    }

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('下载文件失败:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: '下载文件失败' });
        }
      }
    });
  } catch (error) {
    console.error('获取下载链接失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取下载失败'
    });
  }
});

router.get('/history', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const adminId = req.user?.id || 'system';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const history = await ExportService.getExportHistory(adminId, page, limit);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('获取导出历史失败:', error);
    res.status(500).json({ success: false, message: '获取导出历史失败' });
  }
});

module.exports = router;
