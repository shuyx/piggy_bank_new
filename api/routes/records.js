const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, query, validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// 获取星星记录
router.get('/:userId?', [
  query('date').optional().isISO8601().withMessage('日期格式不正确'),
  query('category').optional().isString().withMessage('类别必须是字符串'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('限制数量必须在1-100之间'),
  query('offset').optional().isInt({ min: 0 }).withMessage('偏移量必须是非负整数'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = parseInt(req.params.userId) || 1;
    const { date, category, limit = 20, offset = 0 } = req.query;

    // 构建查询条件
    const where = { userId: userId };

    // 日期筛选
    if (date) {
      const targetDate = new Date(date);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      where.createdAt = {
        gte: targetDate,
        lt: nextDate,
      };
    }

    // 类别筛选
    if (category) {
      where.categoryName = category;
    }

    const records = await prisma.starRecord.findMany({
      where: where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        category: {
          select: {
            id: true,
            name: true,
            emoji: true,
          }
        }
      }
    });

    // 获取总数
    const total = await prisma.starRecord.count({ where });

    res.json({
      records,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('获取记录失败:', error);
    res.status(500).json({ error: '获取记录失败' });
  }
});

// 获取今日记录
router.get('/today/:userId?', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId) || 1;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const records = await prisma.starRecord.findMany({
      where: {
        userId: userId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            emoji: true,
          }
        }
      }
    });

    // 计算今日总星星数
    const totalStars = records.reduce((sum, record) => sum + record.stars, 0);

    res.json({
      records,
      totalStars,
      date: today.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('获取今日记录失败:', error);
    res.status(500).json({ error: '获取今日记录失败' });
  }
});

// 添加星星记录
router.post('/', [
  body('userId').optional().isInt({ min: 1 }).withMessage('用户ID必须是正整数'),
  body('categoryId').optional().isInt({ min: 1 }).withMessage('类别ID必须是正整数'),
  body('categoryName').notEmpty().withMessage('类别名称不能为空'),
  body('stars').isInt({ min: 1, max: 100 }).withMessage('星星数量必须在1-100之间'),
  body('note').optional().isString().withMessage('备注必须是字符串'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId = 1, categoryId, categoryName, stars, note } = req.body;

    // 使用事务确保数据一致性
    const result = await prisma.$transaction(async (tx) => {
      // 创建记录
      const record = await tx.starRecord.create({
        data: {
          userId: userId,
          categoryId: categoryId,
          categoryName: categoryName,
          stars: stars,
          note: note || null,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              emoji: true,
            }
          }
        }
      });

      // 更新用户总星星数
      await tx.user.update({
        where: { id: userId },
        data: {
          totalStars: {
            increment: stars
          }
        }
      });

      return record;
    });

    res.status(201).json({ 
      message: '星星记录添加成功', 
      record: result 
    });
  } catch (error) {
    console.error('添加记录失败:', error);
    res.status(500).json({ error: '添加记录失败' });
  }
});

// 删除星星记录
router.delete('/:id', async (req, res) => {
  try {
    const recordId = parseInt(req.params.id);

    // 获取记录信息
    const record = await prisma.starRecord.findUnique({
      where: { id: recordId }
    });

    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }

    // 使用事务删除记录并更新总星星数
    await prisma.$transaction(async (tx) => {
      // 删除记录
      await tx.starRecord.delete({
        where: { id: recordId }
      });

      // 更新用户总星星数
      await tx.user.update({
        where: { id: record.userId },
        data: {
          totalStars: {
            decrement: record.stars
          }
        }
      });
    });

    res.json({ message: '记录删除成功' });
  } catch (error) {
    console.error('删除记录失败:', error);
    res.status(500).json({ error: '删除记录失败' });
  }
});

module.exports = router;
