const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, query, validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// 获取惩罚记录
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

    const punishments = await prisma.punishment.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    // 获取总数
    const total = await prisma.punishment.count({
      where: { userId: userId }
    });

    res.json({
      punishments,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('获取惩罚记录失败:', error);
    res.status(500).json({ error: '获取惩罚记录失败' });
  }
});

// 添加惩罚记录
router.post('/', [
  body('userId').optional().isInt({ min: 1 }).withMessage('用户ID必须是正整数'),
  body('reason').notEmpty().withMessage('惩罚原因不能为空'),
  body('starsDeducted').isInt({ min: 1, max: 100 }).withMessage('扣除星星数必须在1-100之间'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId = 1, reason, starsDeducted } = req.body;

    // 获取用户当前星星数
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 使用事务确保数据一致性
    const result = await prisma.$transaction(async (tx) => {
      // 创建惩罚记录
      const punishment = await tx.punishment.create({
        data: {
          userId: userId,
          reason: reason,
          starsDeducted: starsDeducted,
        }
      });

      // 扣除用户星星（不能低于0）
      const newTotal = Math.max(0, user.totalStars - starsDeducted);
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          totalStars: newTotal
        }
      });

      return { punishment, user: updatedUser, actualDeducted: user.totalStars - newTotal };
    });

    res.status(201).json({ 
      message: '惩罚记录添加成功',
      punishment: result.punishment,
      actualDeducted: result.actualDeducted,
      remainingStars: result.user.totalStars
    });
  } catch (error) {
    console.error('添加惩罚记录失败:', error);
    res.status(500).json({ error: '添加惩罚记录失败' });
  }
});

// 删除惩罚记录（恢复星星）
router.delete('/:id', async (req, res) => {
  try {
    const punishmentId = parseInt(req.params.id);

    // 获取惩罚记录
    const punishment = await prisma.punishment.findUnique({
      where: { id: punishmentId }
    });

    if (!punishment) {
      return res.status(404).json({ error: '惩罚记录不存在' });
    }

    // 使用事务删除记录并恢复星星
    const result = await prisma.$transaction(async (tx) => {
      // 删除惩罚记录
      await tx.punishment.delete({
        where: { id: punishmentId }
      });

      // 恢复星星
      const updatedUser = await tx.user.update({
        where: { id: punishment.userId },
        data: {
          totalStars: {
            increment: punishment.starsDeducted
          }
        }
      });

      return updatedUser;
    });

    res.json({ 
      message: '惩罚记录删除成功，星星已恢复',
      restoredStars: punishment.starsDeducted,
      currentStars: result.totalStars
    });
  } catch (error) {
    console.error('删除惩罚记录失败:', error);
    res.status(500).json({ error: '删除惩罚记录失败' });
  }
});

// 获取惩罚统计
router.get('/stats/:userId?', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId) || 1;

    // 获取总惩罚次数和扣除的星星数
    const stats = await prisma.punishment.aggregate({
      where: { userId: userId },
      _count: {
        id: true,
      },
      _sum: {
        starsDeducted: true,
      }
    });

    // 获取最近的惩罚记录
    const recentPunishments = await prisma.punishment.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    res.json({
      totalPunishments: stats._count.id || 0,
      totalStarsDeducted: stats._sum.starsDeducted || 0,
      recentPunishments: recentPunishments
    });
  } catch (error) {
    console.error('获取惩罚统计失败:', error);
    res.status(500).json({ error: '获取惩罚统计失败' });
  }
});

module.exports = router;
