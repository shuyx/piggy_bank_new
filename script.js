// 数据存储类
class StarStorage {
    constructor() {
        this.initData();
    }

    initData() {
        if (!localStorage.getItem('starData')) {
            localStorage.setItem('starData', JSON.stringify({
                totalStars: 0,
                categories: ['学习', '家务', '礼貌', '自理'],
                records: [],
                rewards: [],
                punishments: []
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
        this.totalPages = 4;
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
        this.container.style.transform = `translateX(-${pageIndex * 25}%)`;
        
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
                
                // 检查是否是垂直滚动
                const deltaX = Math.abs(endX - startX);
                const deltaY = Math.abs(endY - startY);
                
                if (deltaY > deltaX && deltaY > 20) {
                    isScrolling = true; // 标记为垂直滚动，不触发页面切换
                }
            }
        }, { passive: true });

        this.container.addEventListener('touchend', () => {
            const deltaX = endX - startX;
            const deltaY = Math.abs(endY - startY);
            const deltaTime = Date.now() - startTime;
            
            // 只有在非垂直滚动且水平滑动距离足够的情况下才切换页面
            if (!isScrolling && Math.abs(deltaX) > 50 && deltaY < 100) {
                if (deltaX < -50) { // 左滑，下一页
                    this.goToPage(this.currentPage + 1);
                } else if (deltaX > 50) { // 右滑，上一页
                    this.goToPage(this.currentPage - 1);
                }
            }
            
            // 重置状态
            isScrolling = false;
        }, { passive: true });

        // 点击导航点切换页面
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => this.goToPage(index));
        });

        // 添加键盘支持
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

    updatePageData() {
        switch(this.currentPage) {
            case 0: // 首页
                app.updateHomePage();
                break;
            case 1: // 记录页面
                app.updateRecordPage();
                break;
            case 2: // 奖励页面
                app.updateRewardPage();
                break;
            case 3: // 惩罚页面
                app.updatePunishPage();
                break;
        }
    }
}

// 主应用类
class StarApp {
    constructor() {
        this.storage = new StarStorage();
        this.pageManager = new PageManager();
        this.init();
    }

    init() {
        this.updateHomePage();
        this.loadCategories();
        this.updateAllBalances();
        this.updateStarsVisual(1); // 初始化星星显示
    }

    // 更新首页
    updateHomePage() {
        const data = this.storage.getData();
        document.getElementById('totalStars').textContent = data.totalStars;
        document.getElementById('todayStars').textContent = this.storage.getTodayStars();
    }

    // 更新所有页面的余额显示
    updateAllBalances() {
        const data = this.storage.getData();
        const elements = ['totalStars', 'currentStars1', 'currentStars2', 'recordPageBalance'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (id === 'recordPageBalance') {
                    element.textContent = `${data.totalStars} ⭐`;
                } else if (id === 'totalStars') {
                    element.textContent = data.totalStars;
                } else {
                    element.textContent = `${data.totalStars} ⭐`;
                }
            }
        });
    }

    // 加载分类
    loadCategories() {
        const data = this.storage.getData();
        const select = document.getElementById('categorySelect');
        select.innerHTML = '';
        
        const icons = ['📚', '🏠', '😊', '👕', '🎨', '🏃', '🎵', '🍎'];
        
        data.categories.forEach((category, index) => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = `${icons[index % icons.length]} ${category}`;
            select.appendChild(option);
        });
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
        value = Math.max(1, Math.min(10, value));
        input.value = value;
        this.updateStarsVisual(value);
    }

    // 设置星星数量
    setStars(count) {
        const input = document.getElementById('starCount');
        input.value = Math.max(1, Math.min(10, count));
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
    addStars() {
        const category = document.getElementById('categorySelect').value;
        const stars = parseInt(document.getElementById('starCount').value);
        const note = document.getElementById('noteInput').value;

        const data = this.storage.getData();
        
        // 添加记录
        const record = {
            id: Date.now(),
            category,
            stars,
            note,
            date: new Date().toISOString()
        };
        
        data.records.push(record);
        data.totalStars += stars;
        
        this.storage.saveData(data);
        
        // 重置表单
        document.getElementById('starCount').value = 1;
        document.getElementById('noteInput').value = '';
        this.updateStarsVisual(1); // 重置星星显示
        
        // 更新显示
        this.updateHomePage();
        this.updateRecordPage();
        this.updateAllBalances();
        
        // 显示成功消息
        this.showMessage(`成功添加 ${stars} 颗星星！`, 'success');
    }

    // 更新记录页面
    updateRecordPage() {
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
            200: '心爱玩具',
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

    // 显示消息
    showMessage(message, type = 'info') {
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
            setTimeout(() => document.body.removeChild(messageEl), 300);
        }, 2000);
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

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new StarApp();
});