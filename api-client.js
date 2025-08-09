// API客户端类 - 替代localStorage
class ApiClient {
    constructor() {
        this.baseURL = 'https://piggybanknew-production.up.railway.app/api'; // 生产环境API地址
        this.userId = 1; // 默认用户ID
        this.cache = new Map(); // 简单缓存
        this.init();
    }

    async init() {
        // 检查是否需要数据迁移
        await this.checkMigration();
    }

    // 检查并执行数据迁移
    async checkMigration() {
        try {
            // 检查迁移状态
            const migrationStatus = await this.request(`/migrate/status/${this.userId}`);
            
            if (!migrationStatus.migrated) {
                // 检查localStorage中是否有数据
                const localData = localStorage.getItem('starData');
                if (localData) {
                    console.log('检测到localStorage数据，开始迁移...');
                    await this.migrateFromLocalStorage(JSON.parse(localData));
                }
            }
        } catch (error) {
            console.warn('迁移检查失败，将使用API模式:', error);
        }
    }

    // 从localStorage迁移数据
    async migrateFromLocalStorage(starData) {
        try {
            const result = await this.request('/migrate', {
                method: 'POST',
                body: JSON.stringify({
                    starData: starData,
                    userId: this.userId
                })
            });
            
            console.log('数据迁移成功:', result);
            
            // 迁移成功后备份localStorage数据
            localStorage.setItem('starData_backup', JSON.stringify(starData));
            
            // 显示迁移成功消息
            this.showMigrationSuccess(result);
        } catch (error) {
            console.error('数据迁移失败:', error);
            throw error;
        }
    }

    // 显示迁移成功消息
    showMigrationSuccess(result) {
        const message = `数据迁移成功！\n` +
            `类别: ${result.result.categories}\n` +
            `记录: ${result.result.records}\n` +
            `奖励: ${result.result.rewards}\n` +
            `惩罚: ${result.result.punishments}`;
        
        if (typeof window !== 'undefined' && window.alert) {
            alert(message);
        }
    }

    // 通用请求方法
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API请求失败 ${endpoint}:`, error);
            throw error;
        }
    }

    // 获取用户统计信息
    async getUserStats() {
        const cacheKey = `user_stats_${this.userId}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const stats = await this.request(`/users/stats/${this.userId}`);
        this.cache.set(cacheKey, stats);
        
        // 缓存5分钟
        setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
        
        return stats;
    }

    // 获取类别列表
    async getCategories() {
        return await this.request(`/categories/${this.userId}`);
    }

    // 添加新类别
    async addCategory(name, emoji = '⭐') {
        const result = await this.request('/categories', {
            method: 'POST',
            body: JSON.stringify({
                userId: this.userId,
                name: name,
                emoji: emoji
            })
        });
        
        // 清除缓存
        this.clearCache();
        return result;
    }

    // 获取今日记录
    async getTodayRecords() {
        return await this.request(`/records/today/${this.userId}`);
    }

    // 获取历史记录
    async getRecords(filters = {}) {
        const params = new URLSearchParams();
        if (filters.date) params.append('date', filters.date);
        if (filters.category) params.append('category', filters.category);
        if (filters.limit) params.append('limit', filters.limit);
        if (filters.offset) params.append('offset', filters.offset);

        const queryString = params.toString();
        const endpoint = `/records/${this.userId}${queryString ? '?' + queryString : ''}`;
        
        return await this.request(endpoint);
    }

    // 添加星星记录
    async addStarRecord(categoryId, categoryName, stars, note) {
        const result = await this.request('/records', {
            method: 'POST',
            body: JSON.stringify({
                userId: this.userId,
                categoryId: categoryId,
                categoryName: categoryName,
                stars: stars,
                note: note
            })
        });
        
        // 清除缓存
        this.clearCache();
        return result;
    }

    // 兑换奖励
    async redeemReward(name, cost) {
        const result = await this.request('/rewards', {
            method: 'POST',
            body: JSON.stringify({
                userId: this.userId,
                name: name,
                cost: cost
            })
        });
        
        // 清除缓存
        this.clearCache();
        return result;
    }

    // 获取奖励记录
    async getRewards(limit = 20, offset = 0) {
        return await this.request(`/rewards/${this.userId}?limit=${limit}&offset=${offset}`);
    }

    // 添加惩罚记录
    async addPunishment(reason, starsDeducted) {
        const result = await this.request('/punishments', {
            method: 'POST',
            body: JSON.stringify({
                userId: this.userId,
                reason: reason,
                starsDeducted: starsDeducted
            })
        });
        
        // 清除缓存
        this.clearCache();
        return result;
    }

    // 获取惩罚记录
    async getPunishments(limit = 20, offset = 0) {
        return await this.request(`/punishments/${this.userId}?limit=${limit}&offset=${offset}`);
    }

    // 更新总星星数
    async updateTotalStars(newTotal, reason) {
        const result = await this.request(`/users/stats/${this.userId}`, {
            method: 'PUT',
            body: JSON.stringify({
                totalStars: newTotal,
                reason: reason
            })
        });
        
        // 清除缓存
        this.clearCache();
        return result;
    }

    // 获取管理记录
    async getManageRecords(limit = 20, offset = 0) {
        return await this.request(`/manage/${this.userId}?limit=${limit}&offset=${offset}`);
    }

    // 清除缓存
    clearCache() {
        this.cache.clear();
    }

    // 更新用户总星星数
    async updateUserTotalStars(newTotal, reason) {
        const result = await this.request(`/users/stats/${this.userId}`, {
            method: 'PUT',
            body: JSON.stringify({
                totalStars: newTotal,
                reason: reason
            })
        });

        // 清除相关缓存
        this.clearCache();

        return result;
    }

    // 设置API基础URL（用于生产环境）
    setBaseURL(url) {
        this.baseURL = url;
    }

    // 设置用户ID
    setUserId(userId) {
        this.userId = userId;
        this.clearCache();
    }

    // 重新计算用户总星星数
    async recalculateUserStars() {
        const result = await this.request(`/users/recalculate/${this.userId}`, 'POST');
        
        // 清除相关缓存
        this.clearCache();
        
        return result;
    }
}

// 创建全局API客户端实例
const apiClient = new ApiClient();
