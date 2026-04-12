const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const RedPacket = require('../models/RedPacket');
const RedPacketRecord = require('../models/RedPacketRecord');
const ExportTask = require('../models/ExportTask');

class ExportService {
  constructor() {
    this.exportDir = path.join(__dirname, '../exports');
    this.ensureExportDir();
  }

  async ensureExportDir() {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
    } catch (error) {
      console.error('创建导出目录失败:', error);
    }
  }

  async createExportTask(adminId, config) {
    const taskId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const exportTask = new ExportTask({
      taskId,
      adminId,
      config,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    await exportTask.save();
    return exportTask;
  }

  async processExport(exportTask) {
    try {
      exportTask.status = 'processing';
      exportTask.progress = { current: 0, total: 0, percentage: 0 };
      await exportTask.save();

      const { config } = exportTask;
      const query = this.buildQuery(config);
      const records = await this.fetchRecords(query);

      exportTask.progress.total = records.length;
      await exportTask.save();

      let result;
      if (config.format === 'excel') {
        result = await this.generateExcel(records, config, exportTask);
      } else if (config.format === 'pdf') {
        result = await this.generatePDF(records, config, exportTask);
      } else {
        throw new Error(`不支持的导出格式: ${config.format}`);
      }

      exportTask.status = 'completed';
      exportTask.progress = {
        current: records.length,
        total: records.length,
        percentage: 100
      };
      exportTask.result = result;
      await exportTask.save();

      return exportTask;
    } catch (error) {
      console.error('导出处理失败:', error);
      exportTask.status = 'failed';
      exportTask.result = { error: error.message };
      await exportTask.save();
      throw error;
    }
  }

  buildQuery(config) {
    const query = {};

    if (config.redPacketIds && config.redPacketIds.length > 0) {
      query.redPacketId = { $in: config.redPacketIds };
    }

    if (config.dateRange && config.dateRange.start && config.dateRange.end) {
      query.createdAt = {
        $gte: new Date(config.dateRange.start),
        $lte: new Date(config.dateRange.end)
      };
    }

    if (config.status) {
      query.status = config.status;
    }

    return query;
  }

  async fetchRecords(query) {
    const fieldMap = {
      userId: 1,
      userName: 1,
      userPhone: 1,
      redPacketId: 1,
      amount: 1,
      status: 1,
      claimedAt: 1,
      usedAt: 1,
      expiresAt: 1,
      rejectReason: 1,
      antiAbuseInfo: 1
    };

    return await RedPacketRecord.find(query)
      .populate('userId', 'name phone avatar')
      .populate('redPacketId', 'title type')
      .lean();
  }

  async generateExcel(records, config, exportTask) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '红包管理系统';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('领取记录');

    const headers = this.getHeaders(config.fields);
    worksheet.columns = headers.map(h => ({
      header: h.label,
      key: h.key,
      width: Math.max(h.label.length * 2 + 4, 12)
    }));

    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '007AFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowData = this.formatRecordData(record, config.fields);
      worksheet.addRow(rowData);

      if ((i + 1) % 50 === 0) {
        exportTask.progress.current = i + 1;
        exportTask.progress.percentage = Math.round(((i + 1) / records.length) * 100);
        await exportTask.save();
      }
    }

    exportTask.progress.current = records.length;
    exportTask.progress.percentage = 100;
    await exportTask.save();

    const fileName = `redpacket_export_${Date.now()}.xlsx`;
    const filePath = path.join(this.exportDir, fileName);

    await workbook.xlsx.writeFile(filePath);

    const stats = await fs.stat(filePath);
    return {
      format: 'excel',
      fileName,
      filePath,
      fileSize: stats.size,
      recordCount: records.length,
      generatedAt: new Date()
    };
  }

  async generatePDF(records, config, exportTask) {
    const fileName = `redpacket_export_${Date.now()}.pdf`;
    const filePath = path.join(this.exportDir, fileName);

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const writeStream = require('fs').createWriteStream(filePath);
    doc.pipe(writeStream);

    doc.fontSize(20).text('红包领取记录导出报告', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`导出时间: ${new Date().toLocaleString('zh-CN')}`, { align: 'right' });
    doc.text(`记录总数: ${records.length} 条`, { align: 'right' });
    doc.moveDown();

    const headers = this.getHeaders(config.fields);
    const tableTop = doc.y;
    const colWidths = headers.map(h => {
      switch (h.key) {
        case 'amount': return 80;
        case 'claimedAt':
        case 'usedAt': return 100;
        default: return (doc.page.width - 60) / headers.length;
      }
    });

    doc.fontSize(9).font('Helvetica-Bold');
    let x = 30;
    headers.forEach((h, i) => {
      doc.rect(x, tableTop, colWidths[i], 20).fill('#007AFF');
      doc.fill('white').text(h.label, x + 5, tableTop + 5, { width: colWidths[i] - 10, align: 'center' });
      x += colWidths[i];
    });
    doc.y = tableTop + 25;

    doc.font('Helvetica');
    for (let i = 0; i < records.length; i++) {
      if (doc.y > 750) {
        doc.addPage();
      }

      const record = records[i];
      const rowData = this.formatRecordData(record, config.fields);
      x = 30;

      headers.forEach((h, j) => {
        const value = String(rowData[h.key] || '');
        doc.rect(x, doc.y, colWidths[j], 18).stroke('#E0E0E0');
        doc.text(value, x + 5, doc.y + 4, { width: colWidths[j] - 10 });
        x += colWidths[j];
      });

      doc.y += 20;

      if ((i + 1) % 50 === 0) {
        exportTask.progress.current = i + 1;
        exportTask.progress.percentage = Math.round(((i + 1) / records.length) * 100);
        await exportTask.save();
      }
    }

    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', async () => {
        try {
          const stats = await fs.stat(filePath);
          const result = {
            format: 'pdf',
            fileName,
            filePath,
            fileSize: stats.size,
            recordCount: records.length,
            generatedAt: new Date()
          };

          exportTask.progress.current = records.length;
          exportTask.progress.percentage = 100;
          await exportTask.save();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      writeStream.on('error', reject);
    });
  }

  getHeaders(selectedFields) {
    const allFields = [
      { key: 'userName', label: '用户姓名' },
      { key: 'userPhone', label: '手机号' },
      { key: 'redPacketTitle', label: '红包名称' },
      { key: 'amount', label: '金额(元)' },
      { key: 'status', label: '状态' },
      { key: 'claimedAt', label: '领取时间' },
      { key: 'usedAt', label: '使用时间' },
      { key: 'expiresAt', label: '过期时间' },
      { key: 'rejectReason', label: '拒绝原因' }
    ];

    if (selectedFields && selectedFields.length > 0) {
      return allFields.filter(f => selectedFields.includes(f.key));
    }
    return allFields;
  }

  formatRecordData(record, fields) {
    return {
      userName: record.userName || record.userId?.name || '未知用户',
      userPhone: record.userId?.phone || '',
      redPacketTitle: record.redPacketId?.title || '未知红包',
      amount: record.amount ? `¥${record.amount.toFixed(2)}` : '¥0.00',
      status: this.getStatusText(record.status),
      claimedAt: record.claimedAt ? new Date(record.claimedAt).toLocaleString('zh-CN') : '',
      usedAt: record.usedAt ? new Date(record.usedAt).toLocaleString('zh-CN') : '',
      expiresAt: record.expiresAt ? new Date(record.expiresAt).toLocaleString('zh-CN') : '',
      rejectReason: record.rejectReason || ''
    };
  }

  getStatusText(status) {
    const statusMap = {
      available: '可使用',
      used: '已使用',
      expired: '已过期',
      refunded: '已退款',
      rejected: '已拒绝'
    };
    return statusMap[status] || status;
  }

  async getExportProgress(taskId) {
    const task = await ExportTask.findOne({ taskId }).lean();
    if (!task) {
      throw new Error('导出任务不存在');
    }
    return task;
  }

  async getDownloadUrl(taskId) {
    const task = await ExportTask.findOne({ taskId });
    if (!task || task.status !== 'completed') {
      throw new Error('导出任务未完成或不存在');
    }
    return `/api/admin/red-packets/export/download/${task.taskId}`;
  }

  async getExportHistory(adminId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      ExportTask.find({ adminId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ExportTask.countDocuments({ adminId })
    ]);

    return {
      tasks: tasks.map(task => ({
        taskId: task.taskId,
        format: task.config.format,
        status: task.status,
        progress: task.progress,
        recordCount: task.result?.recordCount,
        fileSize: task.result?.fileSize,
        createdAt: task.createdAt,
        expiresAt: task.expiresAt,
        error: task.result?.error
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async cleanupExpiredExports() {
    const result = await ExportTask.deleteMany({
      expiresAt: { $lt: new Date() },
      status: 'completed'
    });

    for (const task of result) {
      if (task.result?.filePath) {
        try {
          await fs.unlink(task.result.filePath);
        } catch (e) {
          console.warn(`删除过期导出文件失败: ${task.result.filePath}`);
        }
      }
    }

    console.log(`清理了 ${result.deletedCount} 个过期导出任务`);
    return result.deletedCount;
  }
}

module.exports = new ExportService();
