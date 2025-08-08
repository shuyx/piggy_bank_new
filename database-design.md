# 🌟 小星星记录系统 - 数据库设计文档

## 📊 数据库表结构

### 1. users 表 (用户表)
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    total_stars INTEGER DEFAULT 0,
    first_use_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. categories 表 (星星类别表)
```sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    emoji VARCHAR(10) DEFAULT '⭐',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. star_records 表 (星星记录表)
```sql
CREATE TABLE star_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    category_name VARCHAR(50) NOT NULL, -- 冗余存储，防止类别删除后丢失信息
    stars INTEGER NOT NULL CHECK (stars > 0),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. rewards 表 (奖励兑换记录表)
```sql
CREATE TABLE rewards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    cost INTEGER NOT NULL CHECK (cost > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. punishments 表 (惩罚记录表)
```sql
CREATE TABLE punishments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    stars_deducted INTEGER NOT NULL CHECK (stars_deducted > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 6. manage_records 表 (管理操作记录表)
```sql
CREATE TABLE manage_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    old_value INTEGER NOT NULL,
    new_value INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔗 数据关系

- **一对多关系**:
  - users → categories (一个用户有多个类别)
  - users → star_records (一个用户有多个星星记录)
  - users → rewards (一个用户有多个奖励记录)
  - users → punishments (一个用户有多个惩罚记录)
  - users → manage_records (一个用户有多个管理记录)
  - categories → star_records (一个类别有多个记录)

## 📈 索引设计

```sql
-- 用户相关查询优化
CREATE INDEX idx_star_records_user_date ON star_records(user_id, created_at);
CREATE INDEX idx_rewards_user_date ON rewards(user_id, created_at);
CREATE INDEX idx_punishments_user_date ON punishments(user_id, created_at);

-- 日期查询优化
CREATE INDEX idx_star_records_date ON star_records(created_at);
CREATE INDEX idx_categories_user ON categories(user_id);
```

## 🎯 数据约束

1. **星星数量约束**: 星星记录和惩罚的数量必须大于0
2. **用户名唯一性**: 用户名必须唯一
3. **外键约束**: 保证数据完整性
4. **级联删除**: 删除用户时自动删除相关记录

## 📊 初始数据

```sql
-- 默认类别数据
INSERT INTO categories (user_id, name, emoji) VALUES 
(1, '学习', '📚'),
(1, '家务', '🏠'),
(1, '礼貌', '😊'),
(1, '自理', '👕'),
(1, '运动', '🏃');
```
