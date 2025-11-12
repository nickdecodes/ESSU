# 组件说明

## ErrorBoundary - 错误边界组件

### 功能
错误边界是一个 React 组件，用于捕获其子组件树中的 JavaScript 错误，记录错误信息，并显示降级 UI。

### 特性
- ✅ 捕获渲染期间的错误
- ✅ 捕获生命周期方法中的错误
- ✅ 捕获构造函数中的错误
- ✅ 开发环境显示详细错误信息
- ✅ 生产环境显示友好的错误提示
- ✅ 提供刷新和返回按钮
- ✅ 支持错误日志上报（可选）

### 使用方法

#### 1. 包裹整个应用
```jsx
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}
```

#### 2. 包裹特定组件
```jsx
<ErrorBoundary>
  <SomeComponent />
</ErrorBoundary>
```

#### 3. 为不同页面使用独立的错误边界
```jsx
<ErrorBoundary key={pageId}>
  <PageComponent />
</ErrorBoundary>
```

### 错误边界的局限性

错误边界**无法**捕获以下错误：
- ❌ 事件处理器中的错误（使用 try-catch）
- ❌ 异步代码（setTimeout、Promise）
- ❌ 服务端渲染
- ❌ 错误边界自身抛出的错误

### 错误日志上报

如需将错误上报到服务器，取消注释 `logErrorToService` 方法中的代码：

```javascript
logErrorToService = (error, errorInfo) => {
  fetch('/api/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      error: error.toString(),
      errorInfo: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    })
  }).catch(console.error);
};
```

### 测试

开发环境可以使用 `ErrorBoundaryTest` 组件测试错误边界功能：

```jsx
import ErrorBoundaryTest from './components/ErrorBoundaryTest';

// 在开发环境中添加测试按钮
{process.env.NODE_ENV === 'development' && <ErrorBoundaryTest />}
```

### 最佳实践

1. **多层错误边界**：在应用的不同层级使用多个错误边界，避免单个错误导致整个应用崩溃
2. **错误上报**：生产环境应该将错误上报到监控服务
3. **用户友好**：提供清晰的错误提示和恢复选项
4. **日志记录**：记录足够的上下文信息便于调试

## 其他组件

### ImageUpload - 图片上传组件
用于上传和预览图片。

### UserAvatar - 用户头像组件
显示用户头像。
