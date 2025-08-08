const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { query, validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// 获取管理记录
router.get('/:userId?', [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('限制数量必须在1-100之间'),
  query('offset').optional().isInt({ min: 0 }).withMessage('偏移量必须是非负整数'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = parseInt(req.params.userId) || 1;
    const { limit = 20, offset = 0 } = req.query;

    const manageRecords = await prisma.manageRecord.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    // 获取总数
    const total = await prisma.manageRecord.count({
      where: { userId: userId }
    });

    res.json({
      manageRecords,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('获取管理记录失败:', error);
    res.status(500).json({ error: '获取管理记录失败' });
  }
});

// 获取管理统计
router.get('/stats/:userId?', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId) || 1;

    // 获取管理操作统计
    const stats = await prisma.manageRecord.aggregate({
      where: { userId: userId },
      _count: {
        id: true,
      }
    });

    // 获取最近的管理记录
    const recentRecords = await prisma.manageRecord.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // 计算总的星星变化
    const totalChanges = await prisma.manageRecord.findMany({
      where: { userId: userId },
      select: {
        oldValue: true,
        newValue: true,
      }
    });

    let totalIncrease = 0;
    let totalDecrease = 0;

    totalChanges.forEach(record => {
      const change = record.newValue - record.oldValue;
      if (change > 0) {
        totalIncrease += change;
      } else {
        totalDecrease += Math.abs(change);
      }
    });

    res.json({
      totalOperations: stats._count.id || 0,
      totalIncrease,
      totalDecrease,
      recentRecords
    });
  } catch (error) {
    console.error('获取管理统计失败:', error);
    res.status(500).json({ error: '获取管理统计失败' });
  }
});

// 删除管理记录
router.delete('/:id', async (req, res) => {
  try {
    const recordId = parseInt(req.params.id);

    // 检查记录是否存在
    const record = await prisma.manageRecord.findUnique({
      where: { id: recordId }
    });

    if (!record) {
      return res.status(404).json({ error: '管理记录不存在' });
    }

    await prisma.manageRecord.delete({
      where: { id: recordId }
    });

    res.json({ message: '管理记录删除成功' });
  } catch (error) {
    console.error('删除管理记录失败:', error);
    res.status(500).json({ error: '删除管理记录失败' });
  }
});

module.exports = router;
