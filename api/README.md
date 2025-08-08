# 🌟 小星星记录系统 - 后端API

这是小星星记录系统的后端API服务，提供完整的数据库支持。

## 🚀 快速开始

### 1. 安装依赖
```bash
cd api
npm install
```

### 2. 环境配置
```bash
# 复制环境变量文件
cp .env.example .env

# 编辑 .env 文件，配置数据库连接
```

### 3. 数据库设置

#### 使用 SQLite (开发环境)
```bash
# 在 .env 文件中设置
DATABASE_URL="file:./dev.db"

# 生成 Prisma 客户端
npm run db:generate

# 推送数据库结构
npm run db:push

# 初始化数据
npm run db:seed
```

#### 使用 PostgreSQL (生产环境)
```bash
# 在 .env 文件中设置
DATABASE_URL="postgresql://username:password@localhost:5432/star_system"

# 运行数据库迁移
npm run db:migrate

# 初始化数据
npm run db:seed
```

### 4. 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## 📊 API 接口文档

### 用户相关
- `GET /api/users/stats/:userId` - 获取用户统计信息
- `PUT /api/users/stats/:userId` - 更新用户总星星数
- `POST /api/users` - 创建新用户

### 类别管理
- `GET /api/categories/:userId` - 获取用户类别
- `POST /api/categories` - 添加新类别
- `PUT /api/categories/:id` - 更新类别
- `DELETE /api/categories/:id` - 删除类别

### 星星记录
- `GET /api/records/:userId` - 获取记录（支持筛选）
- `GET /api/records/today/:userId` - 获取今日记录
- `POST /api/records` - 添加星星记录
- `DELETE /api/records/:id` - 删除记录

### 奖励系统
- `GET /api/rewards/:userId` - 获取奖励记录
- `POST /api/rewards` - 兑换奖励
- `DELETE /api/rewards/:id` - 删除奖励记录
- `GET /api/rewards/presets` - 获取预设奖励

### 惩罚系统
- `GET /api/punishments/:userId` - 获取惩罚记录
- `POST /api/punishments` - 添加惩罚记录
- `DELETE /api/punishments/:id` - 删除惩罚记录
- `GET /api/punishments/stats/:userId` - 获取惩罚统计

### 管理功能
- `GET /api/manage/:userId` - 获取管理记录
- `GET /api/manage/stats/:userId` - 获取管理统计
- `DELETE /api/manage/:id` - 删除管理记录

### 数据迁移
- `POST /api/migrate` - 从localStorage迁移数据
- `GET /api/migrate/status/:userId` - 检查迁移状态
- `DELETE /api/migrate/reset/:userId` - 清空用户数据

## 🔧 数据库管理

```bash
# 查看数据库
npm run db:studio

# 重置数据库
npm run db:push --force-reset

# 生成新的迁移
npm run db:migrate
```

## 🚀 部署

### Railway 部署
1. 连接 GitHub 仓库
2. 设置环境变量
3. 自动部署

### Render 部署
1. 连接 GitHub 仓库
2. 设置构建命令: `npm install`
3. 设置启动命令: `npm start`
4. 添加 PostgreSQL 数据库
5. 设置环境变量

### 环境变量
```
DATABASE_URL=postgresql://...
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
```

## 📝 注意事项

1. **CORS配置**: 确保前端域名在CORS白名单中
2. **数据库连接**: 生产环境使用PostgreSQL
3. **错误处理**: 所有API都有完整的错误处理
4. **数据验证**: 使用express-validator进行输入验证
5. **事务处理**: 关键操作使用数据库事务确保一致性
