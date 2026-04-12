const express = require('express')
const router = express.Router()
const RedPacket = require('../models/RedPacket')
const RedPacketRecord = require('../models/RedPacketRecord')

router.get('/available', async (req, res) => {
  try {
    const { taskType, targetId } = req.query
    const userId = req.user?.id
    const now = new Date()
    
    const query = {
      status: 'active',
      startTime: { $lte: now },
      endTime: { $gte: now }
    }
    
    if (taskType) query.taskType = taskType
    if (targetId) query['taskConfig.targetId'] = targetId
    
    const redPackets = await RedPacket.find(query).select('title type totalAmount taskType taskConfig claimRules usageRules')
    
    const list = await Promise.all(redPackets.map(async (rp) => {
      const claimedCount = await RedPacketRecord.countDocuments({
        redPacketId: rp._id,
        userId,
        status: { $in: ['available', 'used'] }
      })
      
      return {
        _id: rp._id,
        title: rp.title,
        amountRange: rp.type === 'fixed' 
          ? `¥${(rp.totalAmount / rp.totalCount / 100).toFixed(2)}`
          : `¥${(rp.totalAmount / rp.totalCount / 100 * 0.5).toFixed(2)}-¥${(rp.totalAmount / rp.totalCount / 100 * 1.5).toFixed(2)}`,
        taskType: rp.taskType,
        taskConfig: rp.taskConfig,
        canClaim: claimedCount < (rp.claimRules?.maxClaimsPerUser || 1),
        reason: claimedCount >= (rp.claimRules?.maxClaimsPerUser || 1) ? '已领取过该红包' : ''
      }
    }))
    
    res.json({ success: true, data: { list } })
  } catch (error) {
    res.status(500).json({ success: false, message: '获取可领取红包失败' })
  }
})

router.post('/:id/claim', async (req, res) => {
  try {
    const { taskEvidence } = req.body
    const redPacket = await RedPacket.findById(req.params.id)
    
    if (!redPacket || redPacket.status !== 'active') {
      return res.status(400).json({ success: false, message: '红包不存在或已失效' })
    }
    
    const now = new Date()
    if (now < redPacket.startTime || now > redPacket.endTime) {
      return res.status(400).json({ success: false, message: '不在领取时间范围内' })
    }
    
    if (redPacket.remainingCount <= 0 || redPacket.remainingAmount <= 0) {
      return res.status(400).json({ success: false, message: '红包已被抢光' })
    }
    
    let amount
    if (redPacket.type === 'fixed') {
      amount = Math.round(redPacket.totalAmount / redPacket.totalCount)
    } else {
      amount = Math.round(Math.random() * (redPacket.remainingAmount / redPacket.remainingCount * 2))
      amount = Math.max(1, Math.min(amount, redPacket.remainingAmount))
    }
    
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (redPacket.usageRules?.expireAfterClaim || 30))
    
    const record = await RedPacketRecord.create({
      redPacketId: redPacket._id,
      userId: req.user?.id,
      userPhone: req.user?.phone || '',
      amount,
      status: 'available',
      taskCompletedAt: now,
      taskEvidence: taskEvidence || {},
      expiresAt
    })
    
    await RedPacket.findByIdAndUpdate(redPacket._id, {
      $inc: {
        remainingCount: -1,
        remainingAmount: -amount,
        'stats.sentCount': 1,
        'stats.claimedCount': 1,
        'stats.totalAmountSent': amount
      }
    })
    
    const updated = await RedPacket.findById(redPacket._id)
    if (updated.remainingCount <= 0) {
      updated.status = 'finished'
      await updated.save()
    }
    
    res.json({
      success: true,
      message: `领取成功！获得¥${(amount / 100).toFixed(2)}红包`,
      data: { record, expiresAt }
    })
  } catch (error) {
    console.error('领取红包错误:', error)
    res.status(500).json({ success: false, message: '领取失败: ' + error.message })
  }
})

router.get('/my', async (req, res) => {
  try {
    const { status } = req.query
    const userId = req.user?.id
    const query = { userId }
    
    if (status && ['available', 'used', 'expired'].includes(status)) {
      query.status = status
    }
    
    const records = await RedPacketRecord.find(query)
      .populate('redPacketId', 'title taskType')
      .sort({ createdAt: -1 })
    
    const available = records.filter(r => r.status === 'available')
    const used = records.filter(r => r.status === 'used')
    const expired = records.filter(r => r.status === 'expired')
    
    res.json({
      success: true,
      data: { available, used, expired }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: '获取我的红包失败' })
  }
})

module.exports = router
