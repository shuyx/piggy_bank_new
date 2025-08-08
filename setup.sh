#!/bin/bash

# 🌟 小星星记录系统 - 数据库系统快速安装脚本

echo "🌟 欢迎使用小星星记录系统数据库安装向导"
echo "================================================"

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未检测到Node.js，请先安装Node.js"
    echo "   下载地址: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js版本: $(node --version)"

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未检测到npm"
    exit 1
fi

echo "✅ npm版本: $(npm --version)"

# 进入API目录
echo ""
echo "📦 正在安装后端依赖..."
cd api

# 安装依赖
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 后端依赖安装完成"

# 创建环境变量文件
if [ ! -f .env ]; then
    echo ""
    echo "⚙️  正在创建环境配置文件..."
    cp .env.example .env
    echo "✅ 环境配置文件已创建: api/.env"
    echo "   请根据需要修改数据库连接配置"
fi

# 生成Prisma客户端
echo ""
echo "🔧 正在生成数据库客户端..."
npm run db:generate

if [ $? -ne 0 ]; then
    echo "❌ 数据库客户端生成失败"
    exit 1
fi

echo "✅ 数据库客户端生成完成"

# 推送数据库结构
echo ""
echo "🗄️  正在初始化数据库结构..."
npm run db:push

if [ $? -ne 0 ]; then
    echo "❌ 数据库结构初始化失败"
    exit 1
fi

echo "✅ 数据库结构初始化完成"

# 初始化数据
echo ""
echo "📊 正在初始化基础数据..."
npm run db:seed

if [ $? -ne 0 ]; then
    echo "❌ 基础数据初始化失败"
    exit 1
fi

echo "✅ 基础数据初始化完成"

# 返回根目录
cd ..

# 更新前端文件
echo ""
echo "🔄 正在更新前端配置..."

# 备份原始script.js
if [ -f script.js ] && [ ! -f script-original.js ]; then
    cp script.js script-original.js
    echo "✅ 原始script.js已备份为script-original.js"
fi

# 更新index.html以使用新的脚本
if [ -f index.html ]; then
    # 检查是否已经更新过
    if ! grep -q "api-client.js" index.html; then
        echo "📝 正在更新index.html..."
        
        # 在</body>前添加新的脚本引用
        sed -i.bak 's|<script src="script.js"></script>|<script src="api-client.js"></script>\n    <script src="script-api.js"></script>|' index.html
        
        if [ $? -eq 0 ]; then
            echo "✅ index.html已更新"
            echo "   原文件备份为index.html.bak"
        else
            echo "⚠️  index.html更新失败，请手动更新"
        fi
    else
        echo "✅ index.html已经是最新版本"
    fi
fi

echo ""
echo "🎉 安装完成！"
echo "================================================"
echo ""
echo "🚀 启动说明:"
echo ""
echo "1. 启动后端API服务器:"
echo "   cd api && npm run dev"
echo ""
echo "2. 启动前端服务器 (新终端窗口):"
echo "   python -m http.server 8000"
echo "   或者: npx serve ."
echo ""
echo "3. 访问应用:"
echo "   http://localhost:8000"
echo ""
echo "📚 更多信息:"
echo "   - 查看 DEPLOYMENT_GUIDE.md 了解部署详情"
echo "   - 查看 api/README.md 了解API文档"
echo "   - 查看 database-design.md 了解数据库设计"
echo ""
echo "🔧 配置文件:"
echo "   - 后端配置: api/.env"
echo "   - API地址配置: api-client.js"
echo ""
echo "💡 提示:"
echo "   首次访问时，系统会自动检测并迁移localStorage中的数据"
echo ""
echo "如有问题，请检查控制台输出或查看文档。"
