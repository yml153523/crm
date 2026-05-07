const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { exec } = require('child_process')
const Video = require('../models/Video')
const AuditLog = require('../models/AuditLog')
const { v4: uuidv4 } = require('uuid')

const router = express.Router()

const createVideoAuditLog = async (req, logData) => {
  try {
    const auditLog = {
      action: `${req.method} ${req.path}`,
      resource: 'video',
      method: req.method,
      path: req.originalUrl,
      userId: req.user?.id || null,
      userRole: req.user?.role || null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestBody: req.method !== 'GET' ? {
        ...logData.requestBody
      } : undefined,
      statusCode: logData.statusCode || null,
      responseTime: logData.responseTime || 0,
      success: logData.success || false,
      errorMessage: logData.errorMessage || null,
      timestamp: new Date()
    }
    await AuditLog.create(auditLog)
  } catch (error) {
    console.error('保存视频操作审计日志失败:', error.message)
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads/videos'
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedTypes.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的文件格式'))
    }
  }
})

function getVideoDuration(filePath) {
  return new Promise((resolve) => {
    exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, (error, stdout) => {
      if (error || !stdout) {
        console.log('无法获取视频时长，使用文件大小估算')
        const stats = fs.statSync(filePath)
        resolve(Math.round(stats.size / (1024 * 1024) * 8))
      } else {
        resolve(Math.round(parseFloat(stdout.trim())))
      }
    })
  })
}

function syncVideosToNginx() {
  try {
    const srcDir = process.env.UPLOAD_DIR || './uploads/videos'
    const destDir = '/var/www/uploads/videos'
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }
    if (fs.existsSync(srcDir)) {
      const files = fs.readdirSync(srcDir)
      files.forEach(file => {
        const srcPath = path.join(srcDir, file)
        const destPath = path.join(destDir, file)
        if (fs.statSync(srcPath).isFile()) {
          fs.copyFileSync(srcPath, destPath)
          fs.chmodSync(destPath, 0o755)
        }
      })
      console.log(`✓ 已同步 ${files.length} 个视频文件到 Nginx 目录`)
    }
  } catch (e) {
    console.error('视频同步失败:', e.message)
  }
}

router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status, category, keyword } = req.query
    const query = {}
    
    if (status) query.status = status
    if (category) query.category = category
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ]
    }

    const videos = await Video.find(query)
      .populate('uploadedBy', 'name phone')
      .populate('courseId', 'title')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(parseInt(pageSize))

    const total = await Video.countDocuments(query)

    res.json({
      success: true,
      data: {
        list: videos,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    })
  } catch (error) {
    console.error('获取视频列表错误:', error)
    res.status(500).json({ success: false, message: '获取视频列表失败' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('uploadedBy', 'name phone')
      .populate('courseId', 'title')

    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在' })
    }

    video.viewCount += 1
    await video.save()

    res.json({ success: true, data: { video } })
  } catch (error) {
    console.error('获取视频详情错误:', error)
    res.status(500).json({ success: false, message: '获取视频详情失败' })
  }
})

router.post('/upload', upload.single('video'), async (req, res) => {
  const startTime = Date.now()

  try {
    if (!req.file) {
      await createVideoAuditLog(req, {
        statusCode: 400,
        success: false,
        errorMessage: '请选择要上传的视频文件',
        responseTime: Date.now() - startTime,
        requestBody: { action: 'upload' }
      })
      return res.status(400).json({ success: false, message: '请选择要上传的视频文件' })
    }

    const { title, description, category, courseId, isRecommended } = req.body

    let videoTitle = (title && title.trim()) ? title.trim() : req.file.originalname
    if (videoTitle.includes('.mp4') || videoTitle.includes('.mov') || videoTitle.includes('.avi')) {
      videoTitle = videoTitle.replace(/\.[^.]+$/, '')
    }
    if (videoTitle.length > 200) {
      videoTitle = videoTitle.substring(0, 200)
    }

    const duration = await getVideoDuration(req.file.path)

    const video = await Video.create({
      title: videoTitle,
      description: (description || '').trim(),
      cover: '',
      videoUrl: `/uploads/videos/${req.file.filename}`,
      size: req.file.size,
      duration: duration,
      category: (category || '其他').trim(),
      status: 'published',
      isRecommended: isRecommended === 'true' || isRecommended === true,
      uploadedBy: null,
      courseId: courseId || null
    })

    syncVideosToNginx()

    console.log(`✅ 视频上传成功: ${videoTitle}, 时长: ${duration}秒, 大小: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`)

    await createVideoAuditLog(req, {
      statusCode: 201,
      success: true,
      responseTime: Date.now() - startTime,
      requestBody: {
        action: 'upload',
        title: videoTitle,
        duration: duration,
        fileSize: req.file.size,
        category: category || '其他'
      }
    })

    res.status(201).json({
      success: true,
      data: { video },
      message: '视频上传成功'
    })
  } catch (error) {
    console.error('上传视频错误:', error)
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }

    await createVideoAuditLog(req, {
      statusCode: 500,
      success: false,
      errorMessage: error.message,
      responseTime: Date.now() - startTime,
      requestBody: { action: 'upload', error: true }
    })
    res.status(500).json({ success: false, message: '视频上传失败: ' + error.message })
  }
})

router.put('/:id', async (req, res) => {
  const startTime = Date.now()

  try {
    const { title, description, category, status, isRecommended } = req.body

    const originalVideo = await Video.findById(req.params.id)
    if (!originalVideo) {
      await createVideoAuditLog(req, {
        statusCode: 404,
        success: false,
        errorMessage: '视频不存在',
        responseTime: Date.now() - startTime,
        requestBody: { action: 'update', videoId: req.params.id }
      })
      return res.status(404).json({ success: false, message: '视频不存在' })
    }

    const video = await Video.findByIdAndUpdate(
      req.params.id,
      { title, description, category, status, isRecommended },
      { new: true, runValidators: true }
    )

    await createVideoAuditLog(req, {
      statusCode: 200,
      success: true,
      responseTime: Date.now() - startTime,
      requestBody: {
        action: 'update',
        videoId: req.params.id,
        changes: {
          from: { title: originalVideo.title, category: originalVideo.category },
          to: { title, category }
        }
      }
    })

    res.json({ success: true, data: { video }, message: '更新成功' })
  } catch (error) {
    console.error('更新视频错误:', error)

    await createVideoAuditLog(req, {
      statusCode: 500,
      success: false,
      errorMessage: error.message,
      responseTime: Date.now() - startTime,
      requestBody: { action: 'update', videoId: req.params.id }
    })
    res.status(500).json({ success: false, message: '更新失败: ' + error.message })
  }
})

router.delete('/:id', async (req, res) => {
  const startTime = Date.now()

  try {
    const video = await Video.findById(req.params.id)

    if (!video) {
      await createVideoAuditLog(req, {
        statusCode: 404,
        success: false,
        errorMessage: '视频不存在',
        responseTime: Date.now() - startTime,
        requestBody: { action: 'delete', videoId: req.params.id }
      })
      return res.status(404).json({ success: false, message: '视频不存在' })
    }

    const videoInfo = {
      id: video._id,
      title: video.title,
      videoUrl: video.videoUrl
    }

    await Video.findByIdAndDelete(req.params.id)

    if (video.videoUrl) {
      const localPath = `.${video.videoUrl}`
      const nginxPath = `/var/www${video.videoUrl}`
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath)
      if (fs.existsSync(nginxPath)) fs.unlinkSync(nginxPath)
    }

    await createVideoAuditLog(req, {
      statusCode: 200,
      success: true,
      responseTime: Date.now() - startTime,
      requestBody: {
        action: 'delete',
        deletedVideo: videoInfo
      }
    })

    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('删除视频错误:', error)

    await createVideoAuditLog(req, {
      statusCode: 500,
      success: false,
      errorMessage: error.message,
      responseTime: Date.now() - startTime,
      requestBody: { action: 'delete', videoId: req.params.id }
    })
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

router.post('/progress', async (req, res) => {
  try {
    const { videoId, progress } = req.body

    if (!videoId) {
      return res.status(400).json({ success: false, message: '视频ID不能为空' })
    }

    const numProgress = parseFloat(progress)
    if (isNaN(numProgress) || numProgress < 0 || numProgress > 100) {
      return res.status(400).json({ success: false, message: '进度值必须在0-100之间' })
    }

    const video = await Video.findById(videoId)
    if (!video) {
      return res.status(404).json({ success: false, message: '视频不存在' })
    }

    if (numProgress >= 90) {
      video.completionCount += 1
      await video.save()
    }

    console.log(`[Video] 进度更新: videoId=${videoId} progress=${numProgress}%`)
    res.json({ success: true, message: '进度已记录' })
  } catch (error) {
    console.error('记录进度错误:', error)
    res.status(500).json({ success: false, message: '记录进度失败: ' + error.message })
  }
})

module.exports = router
