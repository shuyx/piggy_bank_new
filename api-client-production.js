// 生产环境API客户端配置
// 复制api-client.js的内容，并修改baseURL

// API客户端类 - 生产环境版本
class ApiClient {
    constructor() {
        // 生产环境API地址 - 替换为你的Railway域名
        this.baseURL = 'https://your-api-name.up.railway.app/api';
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

    // ... 其他方法与api-client.js相同
    // 为了节省空间，这里省略了其他方法
    // 在实际使用时，请复制api-client.js的完整内容并只修改baseURL
}

// 创建全局API客户端实例
const apiClient = new ApiClient();
