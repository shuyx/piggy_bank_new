const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const prisma = new PrismaClient();

// 获取用户的所有类别
router.get('/:userId?', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId) || 1;

    const categories = await prisma.category.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            starRecords: true,
          }
        }
      }
    });

    res.json(categories);
  } catch (error) {
    console.error('获取类别失败:', error);
    res.status(500).json({ error: '获取类别失败' });
  }
});

// 添加新类别
router.post('/', [
  body('userId').optional().isInt({ min: 1 }).withMessage('用户ID必须是正整数'),
  body('name').notEmpty().withMessage('类别名称不能为空'),
  body('emoji').optional().isString().withMessage('表情符号必须是字符串'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId = 1, name, emoji = '⭐' } = req.body;

    // 检查类别是否已存在
    const existingCategory = await prisma.category.findFirst({
      where: {
        userId: userId,
        name: name,
      }
    });

    if (existingCategory) {
      return res.status(400).json({ error: '该类别已存在' });
    }

    const category = await prisma.category.create({
      data: {
        userId: userId,
        name: name,
        emoji: emoji,
      }
    });

    res.status(201).json({ message: '类别创建成功', category });
  } catch (error) {
    console.error('创建类别失败:', error);
    res.status(500).json({ error: '创建类别失败' });
  }
});

// 删除类别
router.delete('/:id', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);

    // 检查类别是否存在
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: {
          select: {
            starRecords: true,
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: '类别不存在' });
    }

    // 如果有关联的记录，提示用户
    if (category._count.starRecords > 0) {
      return res.status(400).json({ 
        error: '该类别下还有记录，无法删除',
        recordCount: category._count.starRecords
      });
    }

    await prisma.category.delete({
      where: { id: categoryId }
    });

    res.json({ message: '类别删除成功' });
  } catch (error) {
    console.error('删除类别失败:', error);
    res.status(500).json({ error: '删除类别失败' });
  }
});

// 更新类别
router.put('/:id', [
  body('name').optional().notEmpty().withMessage('类别名称不能为空'),
  body('emoji').optional().isString().withMessage('表情符号必须是字符串'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const categoryId = parseInt(req.params.id);
    const { name, emoji } = req.body;

    // 构建更新数据
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (emoji !== undefined) updateData.emoji = emoji;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: '没有提供要更新的数据' });
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: updateData
    });

    res.json({ message: '类别更新成功', category });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '类别不存在' });
    }
    console.error('更新类别失败:', error);
    res.status(500).json({ error: '更新类别失败' });
  }
});

module.exports = router;
