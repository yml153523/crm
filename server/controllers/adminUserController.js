const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcrypt');

// 记录审计日志的辅助函数
const createAuditLog = async (req, logData) => {
  try {
    const auditLog = {
      action: `${req.method} ${req.path}`,
      resource: 'admin-user',
      method: req.method,
      path: req.originalUrl,
      userId: req.user?.id || null,
      userRole: req.user?.role || null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestBody: req.method !== 'GET' ? { ...logData.requestBody } : undefined,
      statusCode: logData.statusCode || null,
      responseTime: logData.responseTime || 0,
      success: logData.success || false,
      errorMessage: logData.errorMessage || null,
      timestamp: new Date()
    };
    await AuditLog.create(auditLog);
  } catch (error) {
    console.error('保存管理员操作审计日志失败:', error.message);
  }
};

// 获取管理员列表
const getAdminUsers = async (req, res) => {
  const startTime = Date.now();
  try {
    const { page = 1, pageSize = 20, status } = req.query;

    const query = { role: { $in: ['admin', 'super_admin'] } };

    if (status) {
      query.isActive = status === 'active';
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * parseInt(pageSize))
      .limit(parseInt(pageSize))
      .lean();

    const total = await User.countDocuments(query);

    await createAuditLog(req, {
      statusCode: 200,
      success: true,
      responseTime: Date.now() - startTime
    });

    res.json({
      success: true,
      data: {
        list: users,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          pages: Math.ceil(total / pageSize)
        }
      }
    });
  } catch (error) {
    console.error('获取管理员列表失败:', error);
    await createAuditLog(req, {
      statusCode: 500,
      success: false,
      errorMessage: error.message,
      responseTime: Date.now() - startTime
    });
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: '获取管理员列表失败' }
    });
  }
};

// 创建管理员用户
const createAdminUser = async (req, res) => {
  const startTime = Date.now();
  try {
    const { phone, name, password = '123456', role = 'admin' } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '手机号不能为空' }
      });
    }

    // 检查手机号是否已存在
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_PHONE', message: '该手机号已被注册' }
      });
    }

    // 创建新管理员
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = new User({
      phone,
      name: name || `管理员${phone.slice(-4)}`,
      password: hashedPassword,
      role,
      isActive: true,
      isVIP: false,
      createdBy: req.user?._id
    });

    await newUser.save();

    await createAuditLog(req, {
      statusCode: 201,
      success: true,
      responseTime: Date.now() - startTime,
      requestBody: { phone, name, role }
    });

    res.status(201).json({
      success: true,
      data: {
        _id: newUser._id,
        phone: newUser.phone,
        name: newUser.name,
        role: newUser.role,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt
      },
      message: '管理员创建成功'
    });
  } catch (error) {
    console.error('创建管理员失败:', error);
    await createAuditLog(req, {
      statusCode: 500,
      success: false,
      errorMessage: error.message,
      responseTime: Date.now() - startTime
    });
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: '创建管理员失败' }
    });
  }
};

// 更新管理员信息
const updateAdminUser = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const { name, phone, role } = req.body;

    // 不能修改自己
    if (id === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: '不能修改自己的账号信息' }
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (role && ['admin', 'user'].includes(role)) updateData.role = role;
    updateData.updatedAt = new Date();

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '用户不存在' }
      });
    }

    await createAuditLog(req, {
      statusCode: 200,
      success: true,
      responseTime: Date.now() - startTime,
      requestBody: updateData
    });

    res.json({
      success: true,
      data: updatedUser,
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新管理员失败:', error);
    await createAuditLog(req, {
      statusCode: 500,
      success: false,
      errorMessage: error.message,
      responseTime: Date.now() - startTime
    });
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: '更新失败' }
    });
  }
};

// 切换用户状态（启用/禁用）
const toggleUserStatus = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;

    // 不能禁用自己
    if (id === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: '不能禁用自己的账号' }
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '用户不存在' }
      });
    }

    user.isActive = !user.isActive;
    user.updatedAt = new Date();
    await user.save();

    await createAuditLog(req, {
      statusCode: 200,
      success: true,
      responseTime: Date.now() - startTime,
      requestBody: { action: 'toggle_status', userId: id, newStatus: user.isActive }
    });

    res.json({
      success: true,
      data: { _id: user._id, isActive: user.isActive },
      message: user.isActive ? '已启用' : '已禁用'
    });
  } catch (error) {
    console.error('切换状态失败:', error);
    await createAuditLog(req, {
      statusCode: 500,
      success: false,
      errorMessage: error.message,
      responseTime: Date.now() - startTime
    });
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: '操作失败' }
    });
  }
};

// 重置密码
const resetPassword = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;
    const newPassword = '123456'; // 默认重置密码

    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    const user = await User.findByIdAndUpdate(
      id,
      { password: hashedPassword, updatedAt: new Date() },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '用户不存在' }
      });
    }

    await createAuditLog(req, {
      statusCode: 200,
      success: true,
      responseTime: Date.now() - startTime,
      requestBody: { action: 'reset_password', userId: id }
    });

    res.json({
      success: true,
      message: '密码已重置为 123456'
    });
  } catch (error) {
    console.error('重置密码失败:', error);
    await createAuditLog(req, {
      statusCode: 500,
      success: false,
      errorMessage: error.message,
      responseTime: Date.now() - startTime
    });
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: '重置密码失败' }
    });
  }
};

// 删除管理员（软删除）
const deleteAdminUser = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;

    // 不能删除自己
    if (id === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: '不能删除自己的账号' }
      });
    }

    // 检查是否为超级管理员（不允许删除）
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '用户不存在' }
      });
    }

    if (user.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: '不能删除超级管理员' }
      });
    }

    // 软删除：设置 status 为 deleted
    user.status = 'deleted';
    user.isActive = false;
    user.deletedAt = new Date();
    user.updatedAt = new Date();
    await user.save();

    await createAuditLog(req, {
      statusCode: 200,
      success: true,
      responseTime: Date.now() - startTime,
      requestBody: { action: 'delete', userId: id }
    });

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除管理员失败:', error);
    await createAuditLog(req, {
      statusCode: 500,
      success: false,
      errorMessage: error.message,
      responseTime: Date.now() - startTime
    });
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: '删除失败' }
    });
  }
};

module.exports = {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  toggleUserStatus,
  resetPassword,
  deleteAdminUser
};
