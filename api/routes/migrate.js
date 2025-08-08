const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// 从localStorage迁移数据到数据库
router.post('/', [
  body('starData').isObject().withMessage('starData必须是对象'),
  body('starData.totalStars').isInt({ min: 0 }).withMessage('总星星数必须是非负整数'),
  body('starData.categories').isArray().withMessage('类别必须是数组'),
  body('starData.records').isArray().withMessage('记录必须是数组'),
  body('starData.rewards').isArray().withMessage('奖励必须是数组'),
  body('starData.punishments').isArray().withMessage('惩罚必须是数组'),
  body('userId').optional().isInt({ min: 1 }).withMessage('用户ID必须是正整数'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { starData, userId = 1 } = req.body;
    const {
      totalStars,
      categories,
      records,
      rewards,
      punishments,
      manageRecords = [],
      firstUseDate
    } = starData;

    // 检查用户是否存在，不存在则创建
    let user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          username: `user_${userId}`,
          totalStars: totalStars,
          firstUseDate: firstUseDate ? new Date(firstUseDate) : new Date(),
        }
      });
    }

    // 使用事务进行数据迁移
    const result = await prisma.$transaction(async (tx) => {
      const migrationResult = {
        categories: 0,
        records: 0,
        rewards: 0,
        punishments: 0,
        manageRecords: 0,
        errors: []
      };

      // 1. 迁移类别
      for (const categoryName of categories) {
        try {
          await tx.category.upsert({
            where: {
              userId_name: {
                userId: userId,
                name: categoryName,
              }
            },
            update: {},
            create: {
              userId: userId,
              name: categoryName,
              emoji: getCategoryEmoji(categoryName),
            }
          });
          migrationResult.categories++;
        } catch (error) {
          migrationResult.errors.push(`类别 "${categoryName}" 迁移失败: ${error.message}`);
        }
      }

      // 获取类别映射
      const categoryMap = {};
      const dbCategories = await tx.category.findMany({
        where: { userId: userId }
      });
      dbCategories.forEach(cat => {
        categoryMap[cat.name] = cat.id;
      });

      // 2. 迁移星星记录
      for (const record of records) {
        try {
          await tx.starRecord.create({
            data: {
              userId: userId,
              categoryId: categoryMap[record.category] || null,
              categoryName: record.category,
              stars: record.stars,
              note: record.note || null,
              createdAt: new Date(record.date),
            }
          });
          migrationResult.records++;
        } catch (error) {
          migrationResult.errors.push(`记录迁移失败: ${error.message}`);
        }
      }

      // 3. 迁移奖励记录
      for (const reward of rewards) {
        try {
          await tx.reward.create({
            data: {
              userId: userId,
              name: reward.name,
              cost: reward.cost,
              createdAt: new Date(reward.date),
            }
          });
          migrationResult.rewards++;
        } catch (error) {
          migrationResult.errors.push(`奖励记录迁移失败: ${error.message}`);
        }
      }

      // 4. 迁移惩罚记录
      for (const punishment of punishments) {
        try {
          await tx.punishment.create({
            data: {
              userId: userId,
              reason: punishment.reason,
              starsDeducted: punishment.stars,
              createdAt: new Date(punishment.date),
            }
          });
          migrationResult.punishments++;
        } catch (error) {
          migrationResult.errors.push(`惩罚记录迁移失败: ${error.message}`);
        }
      }

      // 5. 迁移管理记录
      for (const manageRecord of manageRecords) {
        try {
          await tx.manageRecord.create({
            data: {
              userId: userId,
              oldValue: manageRecord.oldValue,
              newValue: manageRecord.newValue,
              reason: manageRecord.reason,
              createdAt: new Date(manageRecord.date),
            }
          });
          migrationResult.manageRecords++;
        } catch (error) {
          migrationResult.errors.push(`管理记录迁移失败: ${error.message}`);
        }
      }

      // 6. 更新用户总星星数
      await tx.user.update({
        where: { id: userId },
        data: {
          totalStars: totalStars,
          firstUseDate: firstUseDate ? new Date(firstUseDate) : user.firstUseDate,
        }
      });

      return migrationResult;
    });

    res.json({
      message: '数据迁移完成',
      result: result,
      userId: userId
    });

  } catch (error) {
    console.error('数据迁移失败:', error);
    res.status(500).json({ 
      error: '数据迁移失败',
      details: error.message
    });
  }
});

// 检查迁移状态
router.get('/status/:userId?', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId) || 1;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            categories: true,
            starRecords: true,
            rewards: true,
            punishments: true,
            manageRecords: true,
          }
        }
      }
    });

    if (!user) {
      return res.json({
        migrated: false,
        message: '用户不存在，可以进行迁移'
      });
    }

    const hasData = user._count.categories > 0 || 
                   user._count.starRecords > 0 || 
                   user._count.rewards > 0 || 
                   user._count.punishments > 0;

    res.json({
      migrated: hasData,
      user: {
        id: user.id,
        username: user.username,
        totalStars: user.totalStars,
        firstUseDate: user.firstUseDate,
      },
      counts: user._count
    });

  } catch (error) {
    console.error('检查迁移状态失败:', error);
    res.status(500).json({ error: '检查迁移状态失败' });
  }
});

// 清空用户数据（用于重新迁移）
router.delete('/reset/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    await prisma.$transaction(async (tx) => {
      // 删除所有相关数据
      await tx.starRecord.deleteMany({ where: { userId } });
      await tx.reward.deleteMany({ where: { userId } });
      await tx.punishment.deleteMany({ where: { userId } });
      await tx.manageRecord.deleteMany({ where: { userId } });
      await tx.category.deleteMany({ where: { userId } });
      
      // 重置用户数据
      await tx.user.update({
        where: { id: userId },
        data: {
          totalStars: 0,
        }
      });
    });

    res.json({ message: '用户数据已清空，可以重新迁移' });

  } catch (error) {
    console.error('清空用户数据失败:', error);
    res.status(500).json({ error: '清空用户数据失败' });
  }
});

// 获取类别对应的表情符号
function getCategoryEmoji(categoryName) {
  const emojiMap = {
    '学习': '📚',
    '家务': '🏠',
    '礼貌': '😊',
    '自理': '👕',
    '运动': '🏃',
  };
  return emojiMap[categoryName] || '⭐';
}

module.exports = router;
