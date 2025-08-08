#!/bin/bash

# 🌐 小星星记录系统 - 远程部署准备脚本

echo "🌐 准备远程部署..."
echo "================================"

# 检查Git是否初始化
if [ ! -d ".git" ]; then
    echo "📦 初始化Git仓库..."
    git init
    echo "✅ Git仓库初始化完成"
else
    echo "✅ Git仓库已存在"
fi

# 检查是否有远程仓库
if ! git remote get-url origin &> /dev/null; then
    echo ""
    echo "⚠️  请先在GitHub创建仓库，然后运行："
    echo "   git remote add origin https://github.com/YOUR_USERNAME/star-system.git"
    echo ""
    read -p "已创建GitHub仓库？(y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "请输入GitHub仓库URL: " repo_url
        git remote add origin $repo_url
        echo "✅ 远程仓库已添加"
    else
        echo "❌ 请先创建GitHub仓库"
        exit 1
    fi
fi

# 更新数据库配置为PostgreSQL
echo ""
echo "🗄️  更新数据库配置为PostgreSQL..."
sed -i.bak 's/provider = "sqlite"/provider = "postgresql"/' api/prisma/schema.prisma
echo "✅ 数据库配置已更新"

# 创建.gitignore文件
echo ""
echo "📝 创建.gitignore文件..."
cat > .gitignore << EOF
# Dependencies
node_modules/
npm-debug.log*

# Environment variables
.env
.env.local

# Database
api/dev.db
api/dev.db-journal

# Logs
*.log

# Backup files
*.bak
*-original.js

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
EOF

echo "✅ .gitignore文件已创建"

# 添加所有文件到Git
echo ""
echo "📦 添加文件到Git..."
git add .

# 提交更改
echo ""
read -p "是否提交更改？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git commit -m "Prepare for remote deployment

- Update database config to PostgreSQL
- Add production environment files
- Create deployment documentation"
    echo "✅ 更改已提交"
fi

# 推送到GitHub
echo ""
read -p "是否推送到GitHub？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git branch -M main
    git push -u origin main
    echo "✅ 代码已推送到GitHub"
fi

echo ""
echo "🎉 部署准备完成！"
echo "================================"
echo ""
echo "📋 下一步操作："
echo ""
echo "1. 🚂 部署后端到Railway:"
echo "   - 访问 https://railway.app"
echo "   - 使用GitHub登录"
echo "   - 创建新项目，选择你的仓库"
echo "   - 添加PostgreSQL数据库"
echo "   - 设置根目录为 'api'"
echo ""
echo "2. 🌐 部署前端到Vercel:"
echo "   - 访问 https://vercel.com"
echo "   - 使用GitHub登录"
echo "   - 导入你的仓库"
echo ""
echo "📚 详细步骤请查看: REMOTE_DEPLOYMENT.md"
