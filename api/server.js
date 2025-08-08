const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: '请求过于频繁，请稍后再试'
});
app.use('/api/', limiter);

// 路由
app.use('/api/users', require('./routes/users'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/records', require('./routes/records'));
app.use('/api/rewards', require('./routes/rewards'));
app.use('/api/punishments', require('./routes/punishments'));
app.use('/api/manage', require('./routes/manage'));
app.use('/api/migrate', require('./routes/migrate'));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 数据库初始化
app.post('/init-db', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // 测试数据库连接
    await prisma.$connect();

    // 创建默认用户（如果不存在）
    const user = await prisma.user.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        username: 'user_1',
        totalStars: 0,
        firstUseDate: new Date(),
      }
    });

    // 创建默认类别
    const categories = ['学习', '家务', '礼貌', '自理', '运动'];
    const categoryEmojis = { '学习': '📚', '家务': '🏠', '礼貌': '😊', '自理': '👕', '运动': '🏃' };

    for (const categoryName of categories) {
      await prisma.category.upsert({
        where: {
          userId_name: {
            userId: 1,
            name: categoryName,
          }
        },
        update: {},
        create: {
          userId: 1,
          name: categoryName,
          emoji: categoryEmojis[categoryName] || '⭐',
        }
      });
    }

    await prisma.$disconnect();

    res.json({
      message: '数据库初始化成功',
      user: user,
      categories: categories
    });

  } catch (error) {
    console.error('数据库初始化失败:', error);
    res.status(500).json({
      error: '数据库初始化失败',
      details: error.message
    });
  }
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('正在关闭服务器...');
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📊 API文档: http://localhost:${PORT}/api`);
});
