// 数据存储类
class StarStorage {
    constructor() {
        this.initData();
    }

    initData() {
        if (!localStorage.getItem('starData')) {
            localStorage.setItem('starData', JSON.stringify({
                totalStars: 0,
                categories: ['学习', '家务', '礼貌', '自理', '运动'],
                records: [],
                rewards: [],
                punishments: [],
                manageRecords: [],
                firstUseDate: new Date().toISOString()
            }));
        }
    }

    getData() {
        return JSON.parse(localStorage.getItem('starData'));
    }

    saveData(data) {
        localStorage.setItem('starData', JSON.stringify(data));
    }

    getTodayRecords() {
        const data = this.getData();
        const today = new Date().toDateString();
        return data.records.filter(record => 
            new Date(record.date).toDateString() === today
        );
    }

    getTodayStars() {
        return this.getTodayRecords().reduce((total, record) => 
            total + record.stars, 0
        );
    }
}

// 页面管理类
class PageManager {
    constructor() {
        this.currentPage = 0;
        this.totalPages = 5;
        this.container = document.getElementById('pagesContainer');
        this.pages = document.querySelectorAll('.page');
        this.dots = document.querySelectorAll('.dot');
        this.initNavigation();
    }

    async goToPage(pageIndex) {
        if (pageIndex < 0 || pageIndex >= this.totalPages) return;

        // 更新导航点
        this.dots[this.currentPage].classList.remove('active');
        this.currentPage = pageIndex;
        this.dots[this.currentPage].classList.add('active');

        // 平滑滚动到目标页面
        this.container.style.transform = `translateX(-${pageIndex * 20}%)`;

        // 更新页面数据
        await this.updatePageData();
    }

    initNavigation() {
        // 只保留点击导航点切换页面的功能，移除手势滑动
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => this.goToPage(index));
        });

        // 保留键盘支持（用于桌面测试）
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.goToPage(this.currentPage - 1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.goToPage(this.currentPage + 1);
            }
        });
    }

    async updatePageData() {
        switch(this.currentPage) {
            case 0: // 首页
                await app.updateHomePage();
                break;
            case 1: // 记录页面
                await app.updateRecordPage();
                break;
            case 2: // 奖励页面
                app.updateRewardPage();
                break;
            case 3: // 惩罚页面
                app.updatePunishPage();
                break;
            case 4: // 管理页面
                await app.updateManagePage();
                break;
        }
    }
}

// 主应用类
class StarApp {
    constructor() {
        this.storage = new StarStorage();
        this.pageManager = new PageManager();
        this.apiClient = new ApiClient();
        this.syncStatus = 'synced'; // 'synced', 'syncing', 'error'
        this.syncListenersAdded = false; // 避免重复添加事件监听器
        this.init();
    }

    async init() {
        // 先显示本地数据，确保界面快速响应
        this.updateHomePage();
        this.updateAllBalances();
        this.updateStarsVisual(1); // 初始化星星显示

        // 然后异步从云端同步数据
        await this.syncFromCloud();
        await this.loadCategories();

        // 启动定期同步机制
        this.startPeriodicSync();
    }

    // 从云端同步数据到本地
    async syncFromCloud() {
        try {
            this.updateSyncStatus('syncing');
            const userStats = await this.apiClient.getUserStats();
            const data = this.storage.getData();

            // 🔑 核心修复：只有云端数据更新时才同步本地
            // 这确保了本地修改不会被意外覆盖
            if (userStats.user.totalStars !== data.totalStars) {
                console.log(`🔄 云端数据有更新: ${data.totalStars} → ${userStats.user.totalStars}`);
                
                const oldTotal = data.totalStars;
                
                // 更新本地存储
                data.totalStars = userStats.user.totalStars;
                this.storage.saveData(data);

                // 更新界面显示
                this.updateHomePage();
                this.updateAllBalances();

                // 显示更新提示
                const change = userStats.user.totalStars - oldTotal;
                const changeText = change > 0 ? `增加了 ${change}` : `减少了 ${Math.abs(change)}`;
                this.showMessage(`检测到云端更新：${changeText}`, 'info', 3000);
            } else {
                console.log('✅ 数据已是最新，无需同步');
            }

            this.updateSyncStatus('synced');
            console.log('✅ 云端同步检查完成');
        } catch (error) {
            console.error('❌ 从云端同步数据失败:', error);
            this.updateSyncStatus('error');
            // 使用本地数据，不显示错误消息（避免干扰用户）
        }
    }

    // 启动定期同步机制
    startPeriodicSync() {
        // 避免重复启动
        if (this.syncInterval) {
            return;
        }

        // 每30秒检查一次云端数据变化
        this.syncInterval = setInterval(async () => {
            await this.checkAndSyncData();
        }, 30000); // 30秒间隔

        // 只在第一次启动时添加事件监听器
        if (!this.syncListenersAdded) {
            // 页面获得焦点时也立即检查一次
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    this.checkAndSyncData();
                }
            });

            // 页面窗口获得焦点时检查
            window.addEventListener('focus', () => {
                this.checkAndSyncData();
            });

            this.syncListenersAdded = true;
        }
    }

    // 检查并同步数据变化
    async checkAndSyncData() {
        // 如果当前正在进行管理操作，跳过同步检查
        if (this.syncStatus === 'syncing') {
            console.log('⏸️ 正在同步中，跳过重复检查');
            return;
        }

        try {
            this.updateSyncStatus('syncing');
            const userStats = await this.apiClient.getUserStats();
            const data = this.storage.getData();
            
            // 检查总星星数是否有变化
            if (userStats.user.totalStars !== data.totalStars) {
                console.log(`🔄 检测到云端数据变化: ${data.totalStars} → ${userStats.user.totalStars}`);
                
                const oldTotal = data.totalStars;
                
                // 更新本地数据
                data.totalStars = userStats.user.totalStars;
                this.storage.saveData(data);
                
                // 更新界面显示
                this.updateHomePage();
                this.updateAllBalances();
                
                // 显示同步提示
                const change = userStats.user.totalStars - oldTotal;
                const changeText = change !== 0 ? (change > 0 ? `增加了 ${change}` : `减少了 ${Math.abs(change)}`) : '';
                this.showMessage(`数据已同步更新！${changeText}`, 'info', 3000);
            }
            
            this.updateSyncStatus('synced');
        } catch (error) {
            console.error('❌ 定期同步检查失败:', error);
            this.updateSyncStatus('error');
            // 静默处理，避免频繁报错
        }
    }

    // 停止定期同步
    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    // 更新同步状态
    updateSyncStatus(status) {
        this.syncStatus = status;
        const indicator = document.getElementById('syncIndicator');
        const statusEl = document.getElementById('syncStatus');
        
        if (!indicator || !statusEl) return;
        
        // 清除所有状态类
        indicator.classList.remove('syncing', 'error');
        
        switch(status) {
            case 'syncing':
                indicator.classList.add('syncing');
                statusEl.textContent = '同步中...';
                break;
            case 'error':
                indicator.classList.add('error');
                statusEl.textContent = '同步失败';
                break;
            case 'synced':
            default:
                statusEl.textContent = '已同步';
                break;
        }
    }

    // 加载用户数据
    async loadUserData() {
        try {
            const userStats = await this.apiClient.getUserStats();
            // 更新本地存储中的用户数据
            const data = this.storage.getData();
            data.totalStars = userStats.user.totalStars;
            this.storage.saveData(data);
        } catch (error) {
            console.error('加载用户数据失败:', error);
        }
    }

    // 更新首页
    updateHomePage() {
        // 🎯 优先使用本地数据，确保界面立即响应
        const data = this.storage.getData();
        document.getElementById('totalStars').textContent = data.totalStars;
        document.getElementById('todayStars').textContent = this.storage.getTodayStars();
    }

    // 更新所有页面的余额显示
    updateAllBalances() {
        // 🎯 优先使用本地数据，确保界面立即响应
        const data = this.storage.getData();
        const totalStars = data.totalStars;
        const elements = ['totalStars', 'currentStars1', 'currentStars2', 'recordPageBalance', 'managePageBalance'];

        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (id === 'recordPageBalance' || id === 'managePageBalance') {
                    element.textContent = `${totalStars} ⭐`;
                } else if (id === 'totalStars') {
                    element.textContent = totalStars;
                } else {
                    element.textContent = `${totalStars} ⭐`;
                }
            }
        });
    }

    // 加载分类
    async loadCategories() {
        try {
            // 从云端API加载类别
            const categories = await this.apiClient.getCategories();
            const select = document.getElementById('categorySelect');
            select.innerHTML = '';

            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = `${category.emoji} ${category.name}`;
                option.textContent = `${category.emoji} ${category.name}`;
                option.dataset.categoryId = category.id;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('加载类别失败:', error);
            // 如果API失败，使用本地数据作为备用
            const data = this.storage.getData();
            const select = document.getElementById('categorySelect');
            select.innerHTML = '';

            const icons = ['📚', '🏠', '😊', '👕', '🎨', '🏃', '🎵', '🍎'];

            data.categories.forEach((category, index) => {
                const option = document.createElement('option');
                option.value = `${icons[index % icons.length]} ${category}`;
                option.textContent = `${icons[index % icons.length]} ${category}`;
                select.appendChild(option);
            });
        }
    }

    // 添加新分类
    addNewCategory() {
        const categoryName = prompt('请输入新的星星类别：');
        if (categoryName && categoryName.trim()) {
            const data = this.storage.getData();
            if (!data.categories.includes(categoryName.trim())) {
                data.categories.push(categoryName.trim());
                this.storage.saveData(data);
                this.loadCategories();
            } else {
                alert('该分类已存在！');
            }
        }
    }

    // 改变星星数量
    changeStars(delta) {
        const input = document.getElementById('starCount');
        let value = parseInt(input.value) + delta;
        value = Math.max(1, value);
        input.value = value;
        this.updateStarsVisual(value);
    }

    // 设置星星数量
    setStars(count) {
        const input = document.getElementById('starCount');
        input.value = Math.max(1, count);
        this.updateStarsVisual(count);
    }

    // 更新星星视觉显示
    updateStarsVisual(count) {
        const visual = document.getElementById('starsVisual');
        if (visual) {
            visual.textContent = '⭐'.repeat(Math.min(count, 5)) + (count > 5 ? `+${count-5}` : '');
        }
    }

    // 改变惩罚星星数量
    changePunishStars(delta) {
        const input = document.getElementById('punishCount');
        let value = parseInt(input.value) + delta;
        value = Math.max(1, Math.min(50, value));
        input.value = value;
    }

    // 设置惩罚星星数量
    setPunishStars(count) {
        const input = document.getElementById('punishCount');
        input.value = Math.max(1, Math.min(50, count));
    }

    // 添加星星
    async addStars() {
        const categorySelect = document.getElementById('categorySelect');
        const category = categorySelect.value;
        const stars = parseInt(document.getElementById('starCount').value);
        const note = document.getElementById('noteInput').value;

        try {
            // 获取类别ID
            const categoryOption = categorySelect.selectedOptions[0];
            const categoryId = categoryOption.dataset.categoryId ? parseInt(categoryOption.dataset.categoryId) : null;
            const categoryName = category.replace(/^[^\s]+ /, ''); // 移除表情符号前缀

            // 调用云端API添加记录
            const result = await this.apiClient.addStarRecord(categoryId, categoryName, stars, note);

            // 重置表单
            document.getElementById('starCount').value = 1;
            document.getElementById('noteInput').value = '';
            this.updateStarsVisual(1); // 重置星星显示

            // 刷新数据并更新显示
            await this.loadUserData();
            await this.updateHomePage();
            await this.updateRecordPage();
            await this.updateAllBalances();

            // 显示成功消息
            this.showMessage(`成功添加 ${stars} 颗星星！`, 'success');
        } catch (error) {
            console.error('添加星星失败:', error);
            this.showMessage('添加星星失败，请重试', 'error');
        }
    }

    // 更新记录页面
    async updateRecordPage() {
        try {
            const [todayRecords, userStats] = await Promise.all([
                this.apiClient.getTodayRecords(),
                this.apiClient.getUserStats()
            ]);

            const container = document.getElementById('todayRecords');
            const summaryEl = document.getElementById('todaySummary');
            const todayTotal = userStats.todayStars;

            // 更新今日总结
            if (summaryEl) {
                summaryEl.textContent = `今天共获得 ${todayTotal} 颗星星`;
            }

            if (!todayRecords || todayRecords.length === 0) {
                container.innerHTML = '<p class="no-records">今天还没有记录</p>';
                return;
            }

            container.innerHTML = todayRecords.map(record => `
                <div class="record-item">
                    <div class="record-info">
                        <span class="category">${record.categoryName}</span>
                        <span class="stars">${record.stars}⭐</span>
                    </div>
                    <div class="record-note">${record.note || ''}</div>
                    <div class="record-time">${new Date(record.createdAt).toLocaleTimeString()}</div>
                </div>
            `).join('');
        } catch (error) {
            console.error('更新记录页面失败:', error);
            // 如果API失败，使用本地存储作为备用
            const todayRecords = this.storage.getTodayRecords();
            const container = document.getElementById('todayRecords');
            const summaryEl = document.getElementById('todaySummary');
            const todayTotal = this.storage.getTodayStars();

            // 更新今日总结
            if (summaryEl) {
                summaryEl.textContent = `今天共获得 ${todayTotal} 颗星星`;
            }

            if (todayRecords.length === 0) {
                container.innerHTML = '<p class="no-records">今天还没有记录</p>';
                return;
            }

            container.innerHTML = todayRecords.map(record => `
                <div class="record-item">
                    <div class="record-info">
                        <span class="category">${record.category}</span>
                        <span class="stars">${record.stars}⭐</span>
                    </div>
                    <div class="record-note">${record.note || ''}</div>
                    <div class="record-time">${new Date(record.date).toLocaleTimeString()}</div>
                </div>
            `).join('');
        }
    }

    // 更新奖励页面
    updateRewardPage() {
        const data = this.storage.getData();
        document.getElementById('currentStars1').textContent = `${data.totalStars} ⭐`;
        
        // 显示奖励记录
        const container = document.getElementById('rewardRecords');
        const recentRewards = data.rewards.slice(-5).reverse();
        
        if (recentRewards.length === 0) {
            container.innerHTML = '<p class="no-records">暂无兑换记录</p>';
            return;
        }
        
        container.innerHTML = recentRewards.map(reward => `
            <div class="history-item">
                <div class="item-info">
                    <span class="item-name">${reward.name}</span>
                    <span class="item-cost">-${reward.cost}⭐</span>
                </div>
                <div class="item-date">${new Date(reward.date).toLocaleDateString()}</div>
            </div>
        `).join('');
    }

    // 快速奖励
    quickReward(cost) {
        const data = this.storage.getData();
        
        if (data.totalStars < cost) {
            this.showMessage('星星不够哦！', 'error');
            return;
        }
        
        const rewardNames = {
            50: '小零食',
            100: '小礼物',
            200: '看电影',
            300: '新书籍',
            500: '特殊惊喜',
            1000: '超级大奖'
        };
        
        if (confirm(`确定要兑换 ${rewardNames[cost]} 吗？将消耗 ${cost} 颗星星。`)) {
            data.totalStars -= cost;
            data.rewards.push({
                id: Date.now(),
                name: rewardNames[cost],
                cost,
                date: new Date().toISOString()
            });
            
            this.storage.saveData(data);
            this.updateHomePage();
            this.updateRewardPage();
            this.updateAllBalances();
            this.showMessage(`成功兑换 ${rewardNames[cost]}！`, 'success');
        }
    }

    // 自定义奖励
    customReward() {
        const name = document.getElementById('rewardName').value.trim();
        const cost = parseInt(document.getElementById('rewardCost').value);
        
        if (!name) {
            this.showMessage('请输入奖励名称！', 'error');
            return;
        }
        
        const data = this.storage.getData();
        
        if (data.totalStars < cost) {
            this.showMessage('星星不够哦！', 'error');
            return;
        }
        
        if (confirm(`确定要兑换 ${name} 吗？将消耗 ${cost} 颗星星。`)) {
            data.totalStars -= cost;
            data.rewards.push({
                id: Date.now(),
                name,
                cost,
                date: new Date().toISOString()
            });
            
            this.storage.saveData(data);
            
            // 重置表单
            document.getElementById('rewardName').value = '';
            document.getElementById('rewardCost').value = 50;
            
            this.updateHomePage();
            this.updateRewardPage();
            this.updateAllBalances();
            this.showMessage(`成功兑换 ${name}！`, 'success');
        }
    }

    // 更新惩罚页面
    updatePunishPage() {
        const data = this.storage.getData();
        document.getElementById('currentStars2').textContent = `${data.totalStars} ⭐`;
        
        // 显示惩罚记录
        const container = document.getElementById('punishRecords');
        const recentPunishments = data.punishments.slice(-5).reverse();
        
        if (recentPunishments.length === 0) {
            container.innerHTML = '<p class="no-records">暂无改正记录</p>';
            return;
        }
        
        container.innerHTML = recentPunishments.map(punishment => `
            <div class="history-item punish">
                <div class="item-info">
                    <span class="item-name">${punishment.reason}</span>
                    <span class="item-cost">-${punishment.stars}⭐</span>
                </div>
                <div class="item-date">${new Date(punishment.date).toLocaleDateString()}</div>
            </div>
        `).join('');
    }

    // 添加惩罚
    addPunishment() {
        const reason = document.getElementById('punishReason').value.trim();
        const stars = parseInt(document.getElementById('punishCount').value);
        
        if (!reason) {
            this.showMessage('请输入惩罚原因！', 'error');
            return;
        }
        
        if (confirm(`确定要因为"${reason}"扣除 ${stars} 颗星星吗？`)) {
            const data = this.storage.getData();
            
            data.totalStars = Math.max(0, data.totalStars - stars);
            data.punishments.push({
                id: Date.now(),
                reason,
                stars,
                date: new Date().toISOString()
            });
            
            this.storage.saveData(data);
            
            // 重置表单
            document.getElementById('punishReason').value = '';
            document.getElementById('punishCount').value = 5;
            
            this.updateHomePage();
            this.updatePunishPage();
            this.updateAllBalances();
            this.showMessage(`已扣除 ${stars} 颗星星`, 'warning');
        }
    }

    // 更新管理页面
    updateManagePage() {
        // 🎯 优先使用本地数据，确保界面立即响应
        const data = this.storage.getData();
        const totalStars = data.totalStars;

        // 更新当前余额显示
        document.getElementById('managePageBalance').textContent = `${totalStars} ⭐`;

        // 设置输入框当前值
        const input = document.getElementById('newTotalStars');
        if (input && (input.value === '0' || input.value === '')) {
            input.value = totalStars;
        }

        // 更新统计数据
        this.updateStatsData();

        // 更新管理记录
        this.updateManageRecords();
    }

    // 更新统计数据
    updateStatsData() {
        // 🎯 优先使用本地数据，确保界面立即响应
        const data = this.storage.getData();

        // 计算使用天数
        const firstUseDate = new Date(data.firstUseDate || new Date());
        const today = new Date();
        const usageDays = Math.ceil((today - firstUseDate) / (1000 * 60 * 60 * 24));

        // 更新统计显示
        document.getElementById('usageDays').textContent = usageDays;
        document.getElementById('recordCount').textContent = data.records.length;
        document.getElementById('rewardCount').textContent = data.rewards.length;
        document.getElementById('punishCount').textContent = data.punishments.length;
    }

    // 更新管理记录
    updateManageRecords() {
        const data = this.storage.getData();
        const container = document.getElementById('manageRecords');
        const recentManageRecords = (data.manageRecords || []).slice(-5).reverse();
        
        if (recentManageRecords.length === 0) {
            container.innerHTML = '<p class="no-records">暂无管理记录</p>';
            return;
        }
        
        container.innerHTML = recentManageRecords.map(record => `
            <div class="history-item">
                <div class="item-info">
                    <span class="item-name">星星数量: ${record.oldValue} → ${record.newValue}</span>
                    <span class="item-cost">${record.newValue > record.oldValue ? '+' : ''}${record.newValue - record.oldValue}⭐</span>
                </div>
                <div class="record-note">${record.reason}</div>
                <div class="item-date">${new Date(record.date).toLocaleDateString()} ${new Date(record.date).toLocaleTimeString()}</div>
            </div>
        `).join('');
    }

    // 改变管理页面星星数量
    changeManageStars(delta) {
        const input = document.getElementById('newTotalStars');
        let value = parseInt(input.value) + delta;
        value = Math.max(0, Math.min(99999, value));
        input.value = value;
    }

    // 更新总星星数
    async updateTotalStars() {
        const newTotal = parseInt(document.getElementById('newTotalStars').value);
        const reason = document.getElementById('changeReason').value.trim();

        if (!reason) {
            this.showMessage('请输入修改原因！', 'error');
            return;
        }

        const data = this.storage.getData();
        const oldTotal = data.totalStars;

        if (newTotal === oldTotal) {
            this.showMessage('星星数量没有变化！', 'warning');
            return;
        }

        if (confirm(`确定要将总星星数从 ${oldTotal} 修改为 ${newTotal} 吗？\n原因：${reason}`)) {
            // 🎯 管理设置：强制重置总星星数，暂停自动同步避免冲突
            
            // 暂时停止定期同步，避免干扰管理操作
            this.stopPeriodicSync();

            this.updateSyncStatus('syncing');
            this.showMessage('正在同步到云端...', 'info');

            try {
                // 1. 先上传到云端，强制设置新的总星星数
                await this.apiClient.updateUserTotalStars(newTotal, reason);
                
                // 2. 云端上传成功后，更新本地数据
                data.totalStars = newTotal;

                // 3. 记录管理操作
                if (!data.manageRecords) {
                    data.manageRecords = [];
                }
                data.manageRecords.push({
                    id: Date.now(),
                    oldValue: oldTotal,
                    newValue: newTotal,
                    reason: reason,
                    date: new Date().toISOString()
                });

                // 4. 保存到本地存储
                this.storage.saveData(data);

                // 5. 更新所有页面显示
                this.updateAllBalances();
                this.updateHomePage();
                this.updateManagePage();

                // 6. 重置表单
                document.getElementById('changeReason').value = '';

                // 7. 显示成功消息
                const change = newTotal - oldTotal;
                const changeText = change > 0 ? `增加了 ${change}` : `减少了 ${Math.abs(change)}`;
                this.showMessage(`总星星数已更新并同步！${changeText} 颗星星`, 'success');

                this.updateSyncStatus('synced');
                console.log('✅ 数据更新并同步成功');
                
                // 5秒后重新启动定期同步，确保管理操作完全生效
                setTimeout(() => {
                    this.startPeriodicSync();
                    console.log('🔄 重新启动定期同步');
                }, 5000);

            } catch (error) {
                console.error('❌ 数据同步失败:', error);
                this.updateSyncStatus('error');
                this.showMessage('云端同步失败，请检查网络连接后重试', 'error');
                
                // 重新启动定期同步
                this.startPeriodicSync();
                
                // 不要更新本地数据，保持原状
            }
        }
    }


    // 切换记录查看模式
    switchRecordView(viewType) {
        const todayTab = document.getElementById('todayTab');
        const historyTab = document.getElementById('historyTab');
        const todayView = document.getElementById('todayView');
        const historyView = document.getElementById('historyView');

        if (viewType === 'today') {
            todayTab.classList.add('active');
            historyTab.classList.remove('active');
            todayView.classList.remove('hidden');
            historyView.classList.add('hidden');
        } else {
            historyTab.classList.add('active');
            todayTab.classList.remove('active');
            historyView.classList.remove('hidden');
            todayView.classList.add('hidden');
            this.loadHistoryRecords();
        }
    }

    // 加载历史记录
    loadHistoryRecords() {
        const data = this.storage.getData();
        
        // 设置日期筛选器默认值为今天
        const dateFilter = document.getElementById('dateFilter');
        if (!dateFilter.value) {
            dateFilter.value = new Date().toISOString().split('T')[0];
        }
        
        this.filterHistoryRecords();
    }

    // 筛选历史记录
    filterHistoryRecords() {
        const data = this.storage.getData();
        const dateFilter = document.getElementById('dateFilter').value;
        const categoryFilter = document.getElementById('categoryFilter').value;
        
        let filteredRecords = data.records;
        
        // 按日期筛选
        if (dateFilter) {
            const filterDate = new Date(dateFilter).toDateString();
            filteredRecords = filteredRecords.filter(record => 
                new Date(record.date).toDateString() === filterDate
            );
        }
        
        // 按类别筛选
        if (categoryFilter) {
            filteredRecords = filteredRecords.filter(record => 
                record.category === categoryFilter
            );
        }
        
        // 按时间倒序排列
        filteredRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        this.displayHistoryRecords(filteredRecords, dateFilter, categoryFilter);
    }

    // 显示历史记录
    displayHistoryRecords(records, dateFilter, categoryFilter) {
        const container = document.getElementById('historyRecords');
        const summaryEl = document.getElementById('historySummary');
        
        // 计算统计信息
        const totalStars = records.reduce((sum, record) => sum + record.stars, 0);
        const recordCount = records.length;
        
        // 更新摘要
        let summaryText = '';
        if (dateFilter) {
            const date = new Date(dateFilter);
            summaryText = `${date.getMonth() + 1}月${date.getDate()}日`;
        } else {
            summaryText = '全部时间';
        }
        
        if (categoryFilter) {
            summaryText += ` - ${categoryFilter}类别`;
        }
        
        summaryText += `：共 ${recordCount} 条记录，获得 ${totalStars} 颗星星`;
        summaryEl.textContent = summaryText;
        
        // 显示记录列表
        if (records.length === 0) {
            container.innerHTML = '<p class="no-records">没有找到匹配的记录</p>';
            return;
        }
        
        container.innerHTML = records.map(record => {
            const date = new Date(record.date);
            return `
                <div class="record-item">
                    <div class="record-info">
                        <span class="category">${record.category}</span>
                        <span class="stars">${record.stars}⭐</span>
                    </div>
                    <div class="record-note">${record.note || ''}</div>
                    <div class="record-time">
                        ${date.getMonth() + 1}月${date.getDate()}日 ${date.toLocaleTimeString()}
                    </div>
                </div>
            `;
        }).join('');
    }

    // 显示消息
    showMessage(message, type = 'info', duration = 3000) {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;

        // 添加到页面
        document.body.appendChild(messageEl);

        // 显示动画
        setTimeout(() => messageEl.classList.add('show'), 10);

        // 自动隐藏
        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(messageEl)) {
                    document.body.removeChild(messageEl);
                }
            }, 300);
        }, duration);
    }
}

// 全局函数
function goToPage(pageIndex) {
    app.pageManager.goToPage(pageIndex);
}

function addNewCategory() {
    app.addNewCategory();
}

function changeStars(delta) {
    app.changeStars(delta);
}

function addStars() {
    app.addStars();
}

function quickReward(cost) {
    app.quickReward(cost);
}

function customReward() {
    app.customReward();
}

function addPunishment() {
    app.addPunishment();
}

function setStars(count) {
    app.setStars(count);
}

function changePunishStars(delta) {
    app.changePunishStars(delta);
}

function setPunishStars(count) {
    app.setPunishStars(count);
}

function changeManageStars(delta) {
    app.changeManageStars(delta);
}

function updateTotalStars() {
    app.updateTotalStars();
}

function switchRecordView(viewType) {
    app.switchRecordView(viewType);
}

function filterHistoryRecords() {
    app.filterHistoryRecords();
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new StarApp();
});