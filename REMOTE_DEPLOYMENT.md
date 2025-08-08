# 🌐 小星星记录系统 - 远程同步部署指南

## 📋 部署概览

将本地系统部署到云端，实现跨设备数据同步：
- **后端**: Railway (Node.js + PostgreSQL)
- **前端**: Vercel (静态托管)
- **成本**: 完全免费（个人使用）

## 🚀 步骤1: 准备GitHub仓库

### 1.1 初始化Git仓库
```bash
# 在项目根目录执行
git init
git add .
git commit -m "Initial commit: 小星星记录系统"
```

### 1.2 创建GitHub仓库
1. 访问 [GitHub.com](https://github.com)
2. 点击 "New repository"
3. 仓库名称：`star-system`
4. 设置为Public（免费部署需要）
5. 点击 "Create repository"

### 1.3 推送代码
```bash
# 替换为你的GitHub用户名
git remote add origin https://github.com/YOUR_USERNAME/star-system.git
git branch -M main
git push -u origin main
```

## 🗄️ 步骤2: 修改数据库配置

### 2.1 更新Prisma配置
修改 `api/prisma/schema.prisma`：
```prisma
datasource db {
  provider = "postgresql"  // 改回PostgreSQL
  url      = env("DATABASE_URL")
}
```

### 2.2 更新环境变量
修改 `api/.env.example`：
```env
# 生产环境数据库（Railway自动提供）
DATABASE_URL="postgresql://user:pass@host:port/db"

# 服务器配置
PORT=3001
NODE_ENV=production

# CORS配置（稍后更新为实际域名）
FRONTEND_URL=https://your-app.vercel.app
```

## 🚂 步骤3: 部署后端到Railway

### 3.1 注册Railway账号
1. 访问 [Railway.app](https://railway.app)
2. 使用GitHub账号登录
3. 授权Railway访问你的仓库

### 3.2 创建新项目
1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 选择你的 `star-system` 仓库
4. 选择 `api` 文件夹作为根目录

### 3.3 添加PostgreSQL数据库
1. 在项目面板中点击 "New"
2. 选择 "Database" → "PostgreSQL"
3. 等待数据库创建完成

### 3.4 配置环境变量
1. 点击你的API服务
2. 进入 "Variables" 标签
3. 添加以下变量：
   ```
   NODE_ENV=production
   FRONTEND_URL=https://your-app.vercel.app  # 稍后更新
   ```
4. `DATABASE_URL` 会自动设置

### 3.5 部署设置
1. 进入 "Settings" 标签
2. 设置 "Root Directory" 为 `api`
3. 确认 "Build Command" 为 `npm install`
4. 确认 "Start Command" 为 `npm start`

### 3.6 获取API URL
部署完成后，复制你的API域名，格式类似：
`https://your-api-name.up.railway.app`

## 🌐 步骤4: 部署前端到Vercel

### 4.1 修改API配置
更新 `api-client.js` 中的baseURL：
```javascript
class ApiClient {
    constructor() {
        // 使用你的Railway API域名
        this.baseURL = 'https://your-api-name.up.railway.app/api';
        this.userId = 1;
        this.cache = new Map();
        this.init();
    }
}
```

### 4.2 提交更改
```bash
git add .
git commit -m "Update API URL for production"
git push
```

### 4.3 部署到Vercel
1. 访问 [Vercel.com](https://vercel.com)
2. 使用GitHub账号登录
3. 点击 "New Project"
4. 选择你的 `star-system` 仓库
5. 保持默认设置，点击 "Deploy"

### 4.4 获取前端URL
部署完成后，复制你的前端域名，格式类似：
`https://star-system.vercel.app`

## 🔧 步骤5: 更新CORS配置

### 5.1 更新Railway环境变量
1. 回到Railway项目
2. 更新 `FRONTEND_URL` 变量为你的Vercel域名
3. 保存并等待重新部署

### 5.2 验证CORS设置
确保 `api/server.js` 中的CORS配置正确：
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8000',
  credentials: true
}));
```

## 📊 步骤6: 数据库初始化

### 6.1 运行数据库迁移
Railway会自动运行以下命令：
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 6.2 验证数据库
访问你的API健康检查端点：
`https://your-api-name.up.railway.app/health`

应该返回：
```json
{"status":"OK","timestamp":"2025-08-08T..."}
```

## 📱 步骤7: 测试跨设备同步

### 7.1 桌面端测试
1. 访问你的Vercel域名
2. 添加一些星星记录
3. 验证功能正常

### 7.2 手机端测试
1. 在手机浏览器中访问相同域名
2. 验证数据同步
3. 测试添加记录功能

### 7.3 PWA安装（可选）
为了更好的移动体验，可以将网站添加到主屏幕：
1. 在手机浏览器中打开网站
2. 点击浏览器菜单
3. 选择"添加到主屏幕"

## 💰 成本说明

### 免费额度
- **Railway**: 每月500小时运行时间（足够个人使用）
- **Vercel**: 无限制静态托管
- **总成本**: 完全免费

### 升级选项
如果超出免费额度：
- **Railway Pro**: $5/月
- **Vercel Pro**: $20/月

## 🔧 故障排除

### 常见问题

**1. CORS错误**
- 检查FRONTEND_URL环境变量
- 确认域名拼写正确

**2. 数据库连接失败**
- 检查DATABASE_URL是否正确设置
- 确认PostgreSQL服务正常运行

**3. API 404错误**
- 检查API路径是否正确
- 确认后端服务正常启动

**4. 部署失败**
- 检查package.json中的scripts
- 查看Railway部署日志

### 调试工具
- Railway日志：项目面板 → Deployments
- Vercel日志：项目面板 → Functions
- 浏览器控制台：F12查看错误信息

## 🎯 验证清单

部署完成后，请验证以下功能：

- [ ] 前端网站可以正常访问
- [ ] API健康检查正常
- [ ] 添加星星记录功能
- [ ] 页面切换功能
- [ ] 数据在不同设备间同步
- [ ] 手机端体验良好
- [ ] HTTPS安全连接

## 🚀 下一步优化

部署成功后，可以考虑：

1. **自定义域名**: 绑定你自己的域名
2. **数据备份**: 设置定期数据备份
3. **监控告警**: 设置服务监控
4. **性能优化**: CDN加速和缓存优化
5. **用户认证**: 添加多用户支持
