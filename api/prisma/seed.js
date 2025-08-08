const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');

  // 创建默认用户
  const user = await prisma.user.upsert({
    where: { username: 'default' },
    update: {},
    create: {
      username: 'default',
      email: 'default@example.com',
      totalStars: 0,
      firstUseDate: new Date(),
    },
  });

  console.log('创建用户:', user);

  // 创建默认类别
  const categories = [
    { name: '学习', emoji: '📚' },
    { name: '家务', emoji: '🏠' },
    { name: '礼貌', emoji: '😊' },
    { name: '自理', emoji: '👕' },
    { name: '运动', emoji: '🏃' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: {
        userId_name: {
          userId: user.id,
          name: category.name,
        },
      },
      update: {},
      create: {
        userId: user.id,
        name: category.name,
        emoji: category.emoji,
      },
    });
  }

  console.log('创建默认类别完成');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
