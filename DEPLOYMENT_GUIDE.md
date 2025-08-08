# 🚀 小星星记录系统 - 数据库部署指南

## 📋 部署步骤总览

### 1️⃣ 本地开发环境搭建

#### 后端API服务
```bash
# 1. 进入API目录
cd api

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置数据库连接

# 4. 初始化数据库（SQLite开发环境）
npm run db:generate
npm run db:push
npm run db:seed

# 5. 启动开发服务器
npm run dev
```

#### 前端适配
```bash
# 1. 在HTML中引入API客户端
# 在 index.html 的 <head> 部分添加：
<script src="api-client.js"></script>

# 2. 替换原有的script.js
# 将 script.js 替换为 script-api.js
<script src="script-api.js"></script>

# 3. 启动前端服务器
python -m http.server 8000
# 或
npx serve .
```

### 2️⃣ 生产环境部署

#### 选项A: Railway部署（推荐）

**后端部署：**
1. 访问 [Railway.app](https://railway.app)
2. 连接GitHub仓库
3. 选择 `api` 目录作为根目录
4. 添加PostgreSQL数据库服务
5. 设置环境变量：
   ```
   DATABASE_URL=postgresql://...（Railway自动提供）
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend-domain.com
   ```
6. 部署完成后获取API URL

**前端部署：**
1. 修改 `api-client.js` 中的 `baseURL`
2. 部署到Vercel/Netlify

#### 选项B: Render部署

**后端部署：**
1. 访问 [Render.com](https://render.com)
2. 创建新的Web Service
3. 连接GitHub仓库，选择 `api` 目录
4. 设置构建命令：`npm install`
5. 设置启动命令：`npm start`
6. 添加PostgreSQL数据库
7. 设置环境变量

### 3️⃣ 数据迁移

#### 自动迁移（推荐）
系统会自动检测localStorage中的数据并提示迁移：

1. 用户首次访问新版本时
2. 系统检测到localStorage中有数据
3. 自动调用迁移API
4. 显示迁移结果

#### 手动迁移
```javascript
// 在浏览器控制台执行
const localData = JSON.parse(localStorage.getItem('starData'));
await apiClient.migrateFromLocalStorage(localData);
```

### 4️⃣ 配置文件更新

#### 更新index.html
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🐷🏦 猪猪银行</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- 页面内容保持不变 -->
    
    <!-- 更新脚本引用 -->
    <script src="api-client.js"></script>
    <script src="script-api.js"></script>
</body>
</html>
```

#### 生产环境API配置
```javascript
// 在api-client.js中更新
class ApiClient {
    constructor() {
        // 生产环境API地址
        this.baseURL = 'https://your-api-domain.com/api';
        // 其他配置...
    }
}
```

### 5️⃣ 环境变量配置

#### 开发环境 (.env)
```env
DATABASE_URL="file:./dev.db"
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:8000
```

#### 生产环境
```env
DATABASE_URL="postgresql://user:password@host:port/database"
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
API_SECRET=your-secret-key
```

### 6️⃣ 测试清单

#### 功能测试
- [ ] 用户统计信息显示
- [ ] 添加星星记录
- [ ] 类别管理
- [ ] 奖励兑换
- [ ] 惩罚记录
- [ ] 管理操作
- [ ] 数据迁移

#### 性能测试
- [ ] API响应时间 < 500ms
- [ ] 数据库查询优化
- [ ] 前端加载速度

#### 安全测试
- [ ] CORS配置正确
- [ ] 输入验证
- [ ] SQL注入防护
- [ ] 速率限制

### 7️⃣ 监控和维护

#### 日志监控
```javascript
// 在生产环境中添加错误监控
window.addEventListener('error', (event) => {
    console.error('前端错误:', event.error);
    // 可以发送到错误监控服务
});
```

#### 数据库备份
```bash
# PostgreSQL备份
pg_dump $DATABASE_URL > backup.sql

# 恢复
psql $DATABASE_URL < backup.sql
```

### 8️⃣ 故障排除

#### 常见问题

**API连接失败**
- 检查CORS配置
- 验证API URL是否正确
- 检查网络连接

**数据迁移失败**
- 检查localStorage数据格式
- 验证API权限
- 查看控制台错误信息

**数据库连接问题**
- 验证DATABASE_URL格式
- 检查数据库服务状态
- 确认网络访问权限

### 9️⃣ 性能优化建议

1. **API缓存**: 实现适当的缓存策略
2. **数据分页**: 大量数据使用分页加载
3. **索引优化**: 确保数据库索引正确
4. **CDN加速**: 静态资源使用CDN
5. **压缩传输**: 启用gzip压缩

### 🔟 安全建议

1. **HTTPS**: 生产环境必须使用HTTPS
2. **输入验证**: 前后端都要验证输入
3. **速率限制**: 防止API滥用
4. **错误处理**: 不暴露敏感信息
5. **定期更新**: 保持依赖包最新
