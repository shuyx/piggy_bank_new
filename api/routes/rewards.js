const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, query, validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// 获取奖励记录
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

    const rewards = await prisma.reward.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    // 获取总数
    const total = await prisma.reward.count({
      where: { userId: userId }
    });

    res.json({
      rewards,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('获取奖励记录失败:', error);
    res.status(500).json({ error: '获取奖励记录失败' });
  }
});

// 兑换奖励
router.post('/', [
  body('userId').optional().isInt({ min: 1 }).withMessage('用户ID必须是正整数'),
  body('name').notEmpty().withMessage('奖励名称不能为空'),
  body('cost').isInt({ min: 1, max: 10000 }).withMessage('消耗星星数必须在1-10000之间'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId = 1, name, cost } = req.body;

    // 检查用户星星是否足够
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (user.totalStars < cost) {
      return res.status(400).json({ 
        error: '星星不够',
        required: cost,
        current: user.totalStars,
        shortage: cost - user.totalStars
      });
    }

    // 使用事务确保数据一致性
    const result = await prisma.$transaction(async (tx) => {
      // 创建奖励记录
      const reward = await tx.reward.create({
        data: {
          userId: userId,
          name: name,
          cost: cost,
        }
      });

      // 扣除用户星星
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          totalStars: {
            decrement: cost
          }
        }
      });

      return { reward, user: updatedUser };
    });

    res.status(201).json({ 
      message: '奖励兑换成功',
      reward: result.reward,
      remainingStars: result.user.totalStars
    });
  } catch (error) {
    console.error('兑换奖励失败:', error);
    res.status(500).json({ error: '兑换奖励失败' });
  }
});

// 删除奖励记录（退还星星）
router.delete('/:id', async (req, res) => {
  try {
    const rewardId = parseInt(req.params.id);

    // 获取奖励记录
    const reward = await prisma.reward.findUnique({
      where: { id: rewardId }
    });

    if (!reward) {
      return res.status(404).json({ error: '奖励记录不存在' });
    }

    // 使用事务删除记录并退还星星
    const result = await prisma.$transaction(async (tx) => {
      // 删除奖励记录
      await tx.reward.delete({
        where: { id: rewardId }
      });

      // 退还星星
      const updatedUser = await tx.user.update({
        where: { id: reward.userId },
        data: {
          totalStars: {
            increment: reward.cost
          }
        }
      });

      return updatedUser;
    });

    res.json({ 
      message: '奖励记录删除成功，星星已退还',
      refundedStars: reward.cost,
      currentStars: result.totalStars
    });
  } catch (error) {
    console.error('删除奖励记录失败:', error);
    res.status(500).json({ error: '删除奖励记录失败' });
  }
});

// 获取预设奖励列表
router.get('/presets', (req, res) => {
  const presets = [
    { name: '小零食', cost: 50, emoji: '🍭' },
    { name: '小礼物', cost: 100, emoji: '🎁' },
    { name: '看电影', cost: 200, emoji: '🎬' },
    { name: '新书籍', cost: 300, emoji: '📚' },
    { name: '特殊惊喜', cost: 500, emoji: '🎉' },
    { name: '超级大奖', cost: 1000, emoji: '🏆' },
  ];

  res.json(presets);
});

module.exports = router;
