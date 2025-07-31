#!/bin/bash

echo "🐷🏦 猪猪银行部署脚本"
echo "===================="

# 检查是否已经设置了remote
if git remote get-url origin &> /dev/null; then
    echo "✅ GitHub远程仓库已配置"
else
    echo "❌ 请先配置GitHub远程仓库："
    echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
    exit 1
fi

# 添加所有更改
echo "📦 添加文件到Git..."
git add .

# 检查是否有更改
if git diff --staged --quiet; then
    echo "ℹ️  没有需要提交的更改"
else
    # 提交更改
    echo "💾 提交更改..."
    read -p "请输入提交信息 (默认: Update): " commit_msg
    commit_msg=${commit_msg:-"Update"}
    git commit -m "$commit_msg"
fi

# 推送到GitHub
echo "🚀 推送到GitHub..."
git push origin main

echo ""
echo "✅ 部署完成!"
echo "📱 你的应用将在几分钟内在Netlify上更新"
echo "🌐 访问: https://你的站点名.netlify.app"