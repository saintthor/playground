# ⚠️ 重要项目约束 - 必须遵守

## 🚨 关键约束

### 1. 无服务器网页应用
- **这是一个无服务器的网页应用，直接在浏览器中运行**
- **使用传统的 `<script>` 标签加载 JavaScript 文件**
- **所有类必须直接在全局作用域中定义**

### 2. 项目配置要求
- **`package.json` 中不能有 `"type": "module"`**
- **HTML 使用传统的 `<script src="...">` 而不是 `<script type="module">`**
- **类定义直接暴露在全局作用域，不使用 ES6 模块系统**

### 3. 正确的类定义方式
```javascript
// ✅ 正确 - 直接定义类（全局作用域）
class Crypto {
    // 类内容
}

// ❌ 错误 - 不要添加 export（会导致语法错误）
class Crypto {
    // 类内容
}
export { Crypto }; // 这会导致语法错误！
```

### 4. 文件加载方式
HTML 中使用：
```html
<script src="src/services/Crypto.js"></script>
<script src="src/ui/UIManager.js"></script>
<!-- 类会自动在全局作用域中可用 -->
```

### 5. 测试环境 vs 浏览器环境
- **测试使用 Vitest，支持 ES6 模块**
- **浏览器运行使用传统脚本加载**
- **这种混合模式是正常的，不要试图统一**

## 🔥 之前的错误教训
1. **错误地在 `package.json` 中添加了 `"type": "module"`**
2. **错误地添加了 `export` 语句导致浏览器语法错误**
3. **错误地将 HTML 改为 `<script type="module">`**
4. **导致控制面板无法加载，破坏了整个应用**

## 📝 修复原则
1. **保持 `package.json` 中没有 `"type": "module"`**
2. **保持 HTML 使用传统的 `<script>` 标签**
3. **保持类定义在全局作用域**
4. **测试问题通过测试配置解决，不影响浏览器兼容性**

## 🎯 核心理念
**这个项目是为浏览器直接运行设计的传统网页应用，不是现代模块化应用！**