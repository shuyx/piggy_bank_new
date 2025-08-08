// 数据存储类 - API版本
class StarStorage {
    constructor() {
        this.apiClient = apiClient;
    }

    async initData() {
        // API版本不需要初始化localStorage
        return true;
    }

    async getData() {
        try {
            const stats = await this.apiClient.getUserStats();
            return {
                totalStars: stats.user.totalStars,
                firstUseDate: stats.user.firstUseDate,
                // 其他数据通过专门的方法获取
            };
        } catch (error) {
            console.error('获取数据失败:', error);
            return { totalStars: 0, firstUseDate: new Date().toISOString() };
        }
    }

    async saveData(data) {
        // API版本不需要保存到localStorage
        // 数据通过各个API接口自动保存
        return true;
    }

    async getTodayRecords() {
        try {
            const result = await this.apiClient.getTodayRecords();
            return result.records || [];
        } catch (error) {
            console.error('获取今日记录失败:', error);
            return [];
        }
    }

    async getTodayStars() {
        try {
            const result = await this.apiClient.getTodayRecords();
            return result.totalStars || 0;
        } catch (error) {
            console.error('获取今日星星数失败:', error);
            return 0;
        }
    }

    async getCategories() {
        try {
            return await this.apiClient.getCategories();
        } catch (error) {
            console.error('获取类别失败:', error);
            return [];
        }
    }

    async addCategory(name, emoji) {
        try {
            return await this.apiClient.addCategory(name, emoji);
        } catch (error) {
            console.error('添加类别失败:', error);
            throw error;
        }
    }
}

// 页面管理类 - 保持不变
class PageManager {
    constructor() {
        this.currentPage = 0;
        this.totalPages = 5;
        this.container = document.getElementById('pagesContainer');
        this.pages = document.querySelectorAll('.page');
        this.dots = document.querySelectorAll('.dot');
        this.initSwipeEvents();
    }

    goToPage(pageIndex) {
        if (pageIndex < 0 || pageIndex >= this.totalPages) return;
        
        // 更新导航点
        this.dots[this.currentPage].classList.remove('active');
        this.currentPage = pageIndex;
        this.dots[this.currentPage].classList.add('active');
        
        // 平滑滚动到目标页面
        this.container.style.transform = `translateX(-${pageIndex * 20}%)`;
        
        // 更新页面数据
        this.updatePageData();
    }

    initSwipeEvents() {
        let startX = 0;
        let startY = 0;
        let endX = 0;
        let endY = 0;
        let isScrolling = false;
        let startTime = 0;

        this.container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startTime = Date.now();
            isScrolling = false;
        }, { passive: true });

        this.container.addEventListener('touchmove', (e) => {
            if (!isScrolling) {
                endX = e.touches[0].clientX;
                endY = e.touches[0].clientY;
                
                const deltaX = Math.abs(endX - startX);
                const deltaY = Math.abs(endY - startY);
                
                if (deltaY > deltaX && deltaY > 20) {
                    isScrolling = true;
                }
            }
        }, { passive: true });

        this.container.addEventListener('touchend', () => {
            if (!isScrolling) {
                const deltaX = endX - startX;
                const deltaTime = Date.now() - startTime;
                
                if (Math.abs(deltaX) > 50 && deltaTime < 300) {
                    if (deltaX > 0) {
                        this.goToPage(this.currentPage - 1);
                    } else {
                        this.goToPage(this.currentPage + 1);
                    }
                }
            }
        }, { passive: true });

        // 点击导航点切换页面
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                this.goToPage(index);
            });
        });
    }

    updatePageData() {
        if (window.app) {
            switch (this.currentPage) {
                case 0:
                    app.updateHomePage();
                    break;
                case 1:
                    app.updateRecordPage();
                    break;
                case 2:
                    app.updateRewardPage();
                    break;
                case 3:
                    app.updatePunishPage();
                    break;
                case 4:
                    app.updateManagePage();
                    break;
            }
        }
    }
}

// 主应用类 - API版本
class StarApp {
    constructor() {
        this.storage = new StarStorage();
        this.pageManager = new PageManager();
        this.init();
    }

    async init() {
        try {
            await this.updateHomePage();
            await this.loadCategories();
            await this.updateAllBalances();
            this.updateStarsVisual(1);
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showMessage('应用初始化失败，请刷新页面重试', 'error');
        }
    }

    // 更新首页
    async updateHomePage() {
        try {
            const stats = await this.storage.apiClient.getUserStats();
            document.getElementById('totalStars').textContent = stats.user.totalStars;
            document.getElementById('todayStars').textContent = stats.todayStars;
        } catch (error) {
            console.error('更新首页失败:', error);
        }
    }

    // 更新所有页面的余额显示
    async updateAllBalances() {
        try {
            const stats = await this.storage.apiClient.getUserStats();
            const totalStars = stats.user.totalStars;
            
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
        } catch (error) {
            console.error('更新余额显示失败:', error);
        }
    }

    // 加载类别
    async loadCategories() {
        try {
            const categories = await this.storage.getCategories();
            const categorySelect = document.getElementById('categorySelect');
            const categoryFilter = document.getElementById('categoryFilter');
            
            if (categorySelect) {
                // 清空所有现有选项
                categorySelect.innerHTML = '';

                // 添加类别选项
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.name;
                    option.textContent = `${category.emoji} ${category.name}`;
                    option.dataset.categoryId = category.id;
                    categorySelect.appendChild(option);
                });
            }
            
            if (categoryFilter) {
                // 更新筛选器
                while (categoryFilter.children.length > 1) {
                    categoryFilter.removeChild(categoryFilter.lastChild);
                }
                
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.name;
                    option.textContent = `${category.emoji} ${category.name}`;
                    categoryFilter.appendChild(option);
                });
            }
        } catch (error) {
            console.error('加载类别失败:', error);
        }
    }

    // 添加新类别
    async addNewCategory() {
        const name = prompt('请输入新类别名称：');
        if (!name || name.trim() === '') return;
        
        const emoji = prompt('请输入类别表情符号（可选）：') || '⭐';
        
        try {
            await this.storage.addCategory(name.trim(), emoji);
            await this.loadCategories();
            this.showMessage(`类别 "${name}" 添加成功！`, 'success');
        } catch (error) {
            console.error('添加类别失败:', error);
            this.showMessage('添加类别失败：' + error.message, 'error');
        }
    }

    // 添加星星
    async addStars() {
        const categorySelect = document.getElementById('categorySelect');
        const categoryName = categorySelect.value;
        const categoryId = categorySelect.selectedOptions[0]?.dataset.categoryId;
        const stars = parseInt(document.getElementById('starCount').value);
        const note = document.getElementById('noteInput').value;

        try {
            await this.storage.apiClient.addStarRecord(
                categoryId ? parseInt(categoryId) : null,
                categoryName,
                stars,
                note
            );
            
            // 重置表单
            document.getElementById('starCount').value = 1;
            document.getElementById('noteInput').value = '';
            this.updateStarsVisual(1);
            
            // 更新显示
            await this.updateHomePage();
            await this.updateRecordPage();
            await this.updateAllBalances();
            
            this.showMessage(`成功添加 ${stars} 颗星星！`, 'success');
        } catch (error) {
            console.error('添加星星失败:', error);
            this.showMessage('添加星星失败：' + error.message, 'error');
        }
    }

    // 显示消息
    showMessage(message, type = 'info') {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        
        // 添加样式
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            max-width: 90%;
            text-align: center;
        `;
        
        // 根据类型设置背景色
        switch (type) {
            case 'success':
                messageEl.style.backgroundColor = '#4CAF50';
                break;
            case 'error':
                messageEl.style.backgroundColor = '#f44336';
                break;
            case 'warning':
                messageEl.style.backgroundColor = '#ff9800';
                break;
            default:
                messageEl.style.backgroundColor = '#2196F3';
        }
        
        document.body.appendChild(messageEl);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }

    // 更新星星显示
    updateStarsVisual(count) {
        const starsVisual = document.getElementById('starsVisual');
        if (starsVisual) {
            starsVisual.textContent = '⭐'.repeat(Math.min(count, 10));
        }
    }

    // 改变星星数量
    changeStars(delta) {
        const input = document.getElementById('starCount');
        const current = parseInt(input.value);
        const newValue = Math.max(1, Math.min(100, current + delta));
        input.value = newValue;
        this.updateStarsVisual(newValue);
    }

    // 设置星星数量
    setStars(count) {
        document.getElementById('starCount').value = count;
        this.updateStarsVisual(count);
    }

    // 更新记录页面
    async updateRecordPage() {
        try {
            const todayData = await this.storage.apiClient.getTodayRecords();
            const container = document.getElementById('todayRecords');
            const summaryEl = document.getElementById('todaySummary');

            if (summaryEl) {
                summaryEl.textContent = `今天共获得 ${todayData.totalStars} 颗星星`;
            }

            if (todayData.records.length === 0) {
                container.innerHTML = '<p class="no-records">今天还没有记录</p>';
                return;
            }

            container.innerHTML = todayData.records.map(record => {
                const date = new Date(record.createdAt);
                return `
                    <div class="record-item">
                        <div class="record-info">
                            <span class="category">${record.categoryName}</span>
                            <span class="stars">${record.stars}⭐</span>
                        </div>
                        <div class="record-note">${record.note || ''}</div>
                        <div class="record-time">
                            ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('更新记录页面失败:', error);
        }
    }

    // 快速奖励
    async quickReward(cost) {
        try {
            const rewardNames = {
                50: '小零食',
                100: '小礼物',
                200: '看电影',
                300: '新书籍',
                500: '特殊惊喜',
                1000: '超级大奖'
            };

            if (confirm(`确定要兑换 ${rewardNames[cost]} 吗？将消耗 ${cost} 颗星星。`)) {
                await this.storage.apiClient.redeemReward(rewardNames[cost], cost);
                await this.updateHomePage();
                await this.updateAllBalances();
                await this.updateRewardPage();
                this.showMessage(`成功兑换 ${rewardNames[cost]}！`, 'success');
            }
        } catch (error) {
            console.error('兑换奖励失败:', error);
            this.showMessage('兑换失败：' + error.message, 'error');
        }
    }

    // 更新奖励页面
    async updateRewardPage() {
        try {
            const rewardsData = await this.storage.apiClient.getRewards(5);
            const container = document.getElementById('rewardRecords');

            if (rewardsData.rewards.length === 0) {
                container.innerHTML = '<p class="no-records">暂无兑换记录</p>';
                return;
            }

            container.innerHTML = rewardsData.rewards.map(reward => `
                <div class="history-item">
                    <div class="item-info">
                        <span class="item-name">${reward.name}</span>
                        <span class="item-cost">-${reward.cost}⭐</span>
                    </div>
                    <div class="item-date">${new Date(reward.createdAt).toLocaleDateString()}</div>
                </div>
            `).join('');
        } catch (error) {
            console.error('更新奖励页面失败:', error);
        }
    }

    // 自定义奖励
    async customReward() {
        const name = document.getElementById('rewardName').value.trim();
        const cost = parseInt(document.getElementById('rewardCost').value);

        if (!name) {
            this.showMessage('请输入奖励名称！', 'error');
            return;
        }

        try {
            if (confirm(`确定要兑换 ${name} 吗？将消耗 ${cost} 颗星星。`)) {
                await this.storage.apiClient.redeemReward(name, cost);

                // 重置表单
                document.getElementById('rewardName').value = '';
                document.getElementById('rewardCost').value = 50;

                await this.updateHomePage();
                await this.updateAllBalances();
                await this.updateRewardPage();
                this.showMessage(`成功兑换 ${name}！`, 'success');
            }
        } catch (error) {
            console.error('自定义奖励失败:', error);
            this.showMessage('兑换失败：' + error.message, 'error');
        }
    }

    // 惩罚相关方法
    changePunishStars(delta) {
        const input = document.getElementById('punishCount');
        const current = parseInt(input.value);
        const newValue = Math.max(1, Math.min(100, current + delta));
        input.value = newValue;
    }

    setPunishStars(count) {
        document.getElementById('punishCount').value = count;
    }

    async addPunishment() {
        const reason = document.getElementById('punishReason').value.trim();
        const stars = parseInt(document.getElementById('punishCount').value);

        if (!reason) {
            this.showMessage('请输入惩罚原因！', 'error');
            return;
        }

        try {
            if (confirm(`确定要因为"${reason}"扣除 ${stars} 颗星星吗？`)) {
                await this.storage.apiClient.addPunishment(reason, stars);

                // 重置表单
                document.getElementById('punishReason').value = '';
                document.getElementById('punishCount').value = 5;

                await this.updateHomePage();
                await this.updateAllBalances();
                await this.updatePunishPage();
                this.showMessage(`已扣除 ${stars} 颗星星`, 'warning');
            }
        } catch (error) {
            console.error('添加惩罚失败:', error);
            this.showMessage('操作失败：' + error.message, 'error');
        }
    }

    async updatePunishPage() {
        try {
            const punishmentsData = await this.storage.apiClient.getPunishments(5);
            const container = document.getElementById('punishRecords');

            if (punishmentsData.punishments.length === 0) {
                container.innerHTML = '<p class="no-records">暂无改正记录</p>';
                return;
            }

            container.innerHTML = punishmentsData.punishments.map(punishment => `
                <div class="history-item punish">
                    <div class="item-info">
                        <span class="item-name">${punishment.reason}</span>
                        <span class="item-cost">-${punishment.starsDeducted}⭐</span>
                    </div>
                    <div class="item-date">${new Date(punishment.createdAt).toLocaleDateString()}</div>
                </div>
            `).join('');
        } catch (error) {
            console.error('更新惩罚页面失败:', error);
        }
    }

    // 管理相关方法
    changeManageStars(delta) {
        const input = document.getElementById('newTotalStars');
        const current = parseInt(input.value) || 0;
        const newValue = Math.max(0, current + delta);
        input.value = newValue;
    }

    async updateTotalStars() {
        const newTotal = parseInt(document.getElementById('newTotalStars').value);
        const reason = document.getElementById('changeReason').value.trim();

        if (!reason) {
            this.showMessage('请输入修改原因！', 'error');
            return;
        }

        try {
            const stats = await this.storage.apiClient.getUserStats();
            const oldTotal = stats.user.totalStars;

            if (newTotal === oldTotal) {
                this.showMessage('星星数量没有变化！', 'warning');
                return;
            }

            if (confirm(`确定要将总星星数从 ${oldTotal} 修改为 ${newTotal} 吗？\n原因：${reason}`)) {
                await this.storage.apiClient.updateTotalStars(newTotal, reason);

                // 重置表单
                document.getElementById('changeReason').value = '';

                await this.updateAllBalances();
                await this.updateHomePage();
                await this.updateManagePage();

                const change = newTotal - oldTotal;
                const changeText = change > 0 ? `增加了 ${change}` : `减少了 ${Math.abs(change)}`;
                this.showMessage(`总星星数已更新！${changeText} 颗星星`, 'success');
            }
        } catch (error) {
            console.error('更新总星星数失败:', error);
            this.showMessage('操作失败：' + error.message, 'error');
        }
    }

    async updateManagePage() {
        try {
            const stats = await this.storage.apiClient.getUserStats();

            // 更新当前余额显示
            document.getElementById('managePageBalance').textContent = `${stats.user.totalStars} ⭐`;

            // 设置输入框当前值
            const input = document.getElementById('newTotalStars');
            if (input && input.value === '0') {
                input.value = stats.user.totalStars;
            }

            // 更新统计数据
            document.getElementById('usageDays').textContent = stats.user.usageDays;
            document.getElementById('recordCount').textContent = stats.counts.records;
            document.getElementById('rewardCount').textContent = stats.counts.rewards;
            document.getElementById('punishCount').textContent = stats.counts.punishments;

            // 更新管理记录
            const manageData = await this.storage.apiClient.getManageRecords(5);
            const container = document.getElementById('manageRecords');

            if (manageData.manageRecords.length === 0) {
                container.innerHTML = '<p class="no-records">暂无管理记录</p>';
                return;
            }

            container.innerHTML = manageData.manageRecords.map(record => `
                <div class="history-item">
                    <div class="item-info">
                        <span class="item-name">${record.reason}</span>
                        <span class="item-cost">${record.oldValue} → ${record.newValue}</span>
                    </div>
                    <div class="item-date">${new Date(record.createdAt).toLocaleDateString()}</div>
                </div>
            `).join('');
        } catch (error) {
            console.error('更新管理页面失败:', error);
        }
    }

    // 记录视图切换
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
            todayTab.classList.remove('active');
            historyTab.classList.add('active');
            todayView.classList.add('hidden');
            historyView.classList.remove('hidden');
            this.loadHistoryRecords();
        }
    }

    async loadHistoryRecords() {
        try {
            const records = await this.storage.apiClient.getRecords({ limit: 50 });
            const container = document.getElementById('historyRecords');

            if (records.records.length === 0) {
                container.innerHTML = '<p class="no-records">暂无历史记录</p>';
                return;
            }

            container.innerHTML = records.records.map(record => {
                const date = new Date(record.createdAt);
                return `
                    <div class="record-item">
                        <div class="record-info">
                            <span class="category">${record.categoryName}</span>
                            <span class="stars">${record.stars}⭐</span>
                        </div>
                        <div class="record-note">${record.note || ''}</div>
                        <div class="record-time">
                            ${date.getMonth() + 1}月${date.getDate()}日 ${date.toLocaleTimeString()}
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('加载历史记录失败:', error);
        }
    }

    async filterHistoryRecords() {
        // 简化版本，实际应用中可以添加更复杂的筛选逻辑
        await this.loadHistoryRecords();
    }
}

// 全局函数 - 保持与原版本的兼容性
function goToPage(pageIndex) {
    if (window.app && window.app.pageManager) {
        window.app.pageManager.goToPage(pageIndex);
    }
}

function addNewCategory() {
    if (window.app) {
        window.app.addNewCategory();
    }
}

function changeStars(delta) {
    if (window.app) {
        window.app.changeStars(delta);
    }
}

function setStars(count) {
    if (window.app) {
        window.app.setStars(count);
    }
}

function addStars() {
    if (window.app) {
        window.app.addStars();
    }
}

function quickReward(cost) {
    if (window.app) {
        window.app.quickReward(cost);
    }
}

function customReward() {
    if (window.app) {
        window.app.customReward();
    }
}

function changePunishStars(delta) {
    if (window.app) {
        window.app.changePunishStars(delta);
    }
}

function setPunishStars(count) {
    if (window.app) {
        window.app.setPunishStars(count);
    }
}

function addPunishment() {
    if (window.app) {
        window.app.addPunishment();
    }
}

function changeManageStars(delta) {
    if (window.app) {
        window.app.changeManageStars(delta);
    }
}

function updateTotalStars() {
    if (window.app) {
        window.app.updateTotalStars();
    }
}

function switchRecordView(viewType) {
    if (window.app) {
        window.app.switchRecordView(viewType);
    }
}

function filterHistoryRecords() {
    if (window.app) {
        window.app.filterHistoryRecords();
    }
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', async () => {
    try {
        app = new StarApp();
        window.app = app; // 使全局可访问
    } catch (error) {
        console.error('应用初始化失败:', error);
    }
});
