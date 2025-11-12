import { useState } from 'react';
import { Button, Space, Card } from 'antd';

/**
 * 错误边界测试组件
 * 仅用于开发环境测试错误边界功能
 */
const ErrorBoundaryTest = () => {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    // 故意抛出错误来测试错误边界
    throw new Error('这是一个测试错误！');
  }

  const triggerError = () => {
    setShouldThrow(true);
  };

  const triggerAsyncError = () => {
    setTimeout(() => {
      throw new Error('这是一个异步错误！');
    }, 100);
  };

  const triggerPromiseError = () => {
    Promise.reject(new Error('这是一个 Promise 错误！'));
  };

  return (
    <Card title="错误边界测试（仅开发环境）" style={{ margin: '20px' }}>
      <Space direction="vertical" size="middle">
        <div>
          <p>点击下面的按钮测试不同类型的错误：</p>
        </div>
        
        <Button danger onClick={triggerError}>
          触发渲染错误（会被错误边界捕获）
        </Button>
        
        <Button onClick={triggerAsyncError}>
          触发异步错误（不会被错误边界捕获）
        </Button>
        
        <Button onClick={triggerPromiseError}>
          触发 Promise 错误（不会被错误边界捕获）
        </Button>

        <div style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
          <p><strong>说明：</strong></p>
          <ul>
            <li>错误边界只能捕获渲染期间、生命周期方法和构造函数中的错误</li>
            <li>不能捕获事件处理器、异步代码、服务端渲染和错误边界自身的错误</li>
            <li>生产环境中应该移除此测试组件</li>
          </ul>
        </div>
      </Space>
    </Card>
  );
};

export default ErrorBoundaryTest;
