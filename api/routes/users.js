const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// 获取用户统计信息
router.get('/stats/:userId?', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId) || 1; // 默认用户ID为1
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            starRecords: true,
            rewards: true,
            punishments: true,
            manageRecords: true,
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 计算今日获得的星星数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStars = await prisma.starRecord.aggregate({
      where: {
        userId: userId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        }
      },
      _sum: {
        stars: true,
      }
    });

    // 计算使用天数
    const usageDays = Math.ceil((new Date() - user.firstUseDate) / (1000 * 60 * 60 * 24));

    res.json({
      user: {
        id: user.id,
        username: user.username,
        totalStars: user.totalStars,
        firstUseDate: user.firstUseDate,
        usageDays: usageDays,
      },
      todayStars: todayStars._sum.stars || 0,
      counts: {
        records: user._count.starRecords,
        rewards: user._count.rewards,
        punishments: user._count.punishments,
        manageRecords: user._count.manageRecords,
      }
    });
  } catch (error) {
    console.error('获取用户统计失败:', error);
    res.status(500).json({ error: '获取用户统计失败' });
  }
});

// 更新用户总星星数
router.put('/stats/:userId', [
  body('totalStars').isInt({ min: 0 }).withMessage('总星星数必须是非负整数'),
  body('reason').notEmpty().withMessage('修改原因不能为空'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = parseInt(req.params.userId);
    const { totalStars, reason } = req.body;

    // 获取当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!currentUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 使用事务更新用户星星数并记录管理操作
    const result = await prisma.$transaction(async (tx) => {
      // 更新用户总星星数
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { totalStars: totalStars }
      });

      // 记录管理操作
      await tx.manageRecord.create({
        data: {
          userId: userId,
          oldValue: currentUser.totalStars,
          newValue: totalStars,
          reason: reason,
        }
      });

      return updatedUser;
    });

    res.json({
      message: '总星星数更新成功',
      user: result,
      change: totalStars - currentUser.totalStars
    });
  } catch (error) {
    console.error('更新用户统计失败:', error);
    res.status(500).json({ error: '更新用户统计失败' });
  }
});

// 重新计算用户总星星数（修复数据不一致问题）
router.post('/recalculate/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // 使用事务确保数据一致性
    const result = await prisma.$transaction(async (tx) => {
      // 计算所有记录的总星星数
      const records = await tx.starRecord.findMany({
        where: { userId: userId },
        select: { stars: true }
      });

      const calculatedTotal = records.reduce((sum, record) => sum + record.stars, 0);

      // 获取当前用户信息
      const currentUser = await tx.user.findUnique({
        where: { id: userId }
      });

      if (!currentUser) {
        throw new Error('用户不存在');
      }

      // 更新用户总星星数为计算出的正确值
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { totalStars: calculatedTotal }
      });

      // 记录修复操作
      await tx.manageRecord.create({
        data: {
          userId: userId,
          oldValue: currentUser.totalStars,
          newValue: calculatedTotal,
          reason: '系统自动修复：重新计算总星星数',
        }
      });

      return {
        oldTotal: currentUser.totalStars,
        newTotal: calculatedTotal,
        recordCount: records.length,
        difference: calculatedTotal - currentUser.totalStars
      };
    });

    res.json({
      message: '总星星数重新计算完成',
      result: result
    });
  } catch (error) {
    console.error('重新计算总星星数失败:', error);
    res.status(500).json({ error: '重新计算失败' });
  }
});

// 创建新用户（可选功能）
router.post('/', [
  body('username').notEmpty().withMessage('用户名不能为空'),
  body('email').optional().isEmail().withMessage('邮箱格式不正确'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email } = req.body;

    const user = await prisma.user.create({
      data: {
        username,
        email,
        totalStars: 0,
      }
    });

    res.status(201).json({ message: '用户创建成功', user });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }
    console.error('创建用户失败:', error);
    res.status(500).json({ error: '创建用户失败' });
  }
});

module.exports = router;
