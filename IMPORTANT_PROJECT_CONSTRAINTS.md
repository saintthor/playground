# ⚠️ Important Project Constraints - Must Be Followed

## 🚨 Key Constraints

### 1. Serverless Web Application
- **This is a serverless web application that runs directly in the browser.**
- **It uses traditional `<script>` tags to load JavaScript files.**
- **All classes must be defined directly in the global scope.**

### 2. Project Configuration Requirements
- **There must NOT be `"type": "module"` in `package.json`.**
- **The HTML must use traditional `<script src="...">`, not `<script type="module">`.**
- **Class definitions are exposed directly to the global scope, without using the ES6 module system.**

### 3. Correct Way to Define Classes
```javascript
// ✅ Correct - Define the class directly (in the global scope)
class Crypto {
    // class content
}

// ❌ Incorrect - Do not add export (this will cause a syntax error)
class Crypto {
    // class content
}
export { Crypto }; // This will cause a syntax error!
```

### 4. How to Load Files
In the HTML, use:
```html
<script src="src/services/Crypto.js"></script>
<script src="src/ui/UIManager.js"></script>
<!-- The classes will automatically be available in the global scope -->
```

### 5. Test Environment vs. Browser Environment
- **Tests use Vitest, which supports ES6 modules.**
- **The browser runs using traditional script loading.**
- **This hybrid model is intentional; do not try to unify them.**

## 🔥 Lessons Learned from Previous Mistakes
1.  **Incorrectly added `"type": "module"` to `package.json`.**
2.  **Incorrectly added `export` statements, causing browser syntax errors.**
3.  **Incorrectly changed the HTML to use `<script type="module">`.**
4.  **This led to the control panel failing to load, breaking the entire application.**

## 📝 Principles for Fixes
1.  **Keep `"type": "module"` out of `package.json`.**
2.  **Keep the HTML using traditional `<script>` tags.**
3.  **Keep class definitions in the global scope.**
4.  **Solve testing issues through test configuration, without affecting browser compatibility.**

## 🎯 Core Concept
**This project is designed as a traditional web application to be run directly in the browser, not a modern modular application!**
