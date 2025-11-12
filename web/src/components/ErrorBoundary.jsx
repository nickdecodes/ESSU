import { Component } from 'react';
import { Result, Button } from 'antd';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    console.error('ErrorBoundary caught an error:', error);
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 记录错误信息
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // 可以将错误日志上报给服务器
    // this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    console.log('Error logged to service:', { error, errorInfo });
    // 发送错误信息到后端日志服务
    // fetch('/api/log-error', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     error: error.toString(),
    //     errorInfo: errorInfo.componentStack,
    //     timestamp: new Date().toISOString(),
    //     userAgent: navigator.userAgent,
    //     url: window.location.href
    //   })
    // }).catch(console.error);
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 自定义降级 UI
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          padding: '20px'
        }}>
          <Result
            status="error"
            title="页面出错了"
            subTitle="抱歉，页面遇到了一些问题。您可以尝试刷新页面或返回首页。"
            extra={[
              <Button type="primary" key="reload" onClick={this.handleReload}>
                刷新页面
              </Button>,
              <Button key="reset" onClick={this.handleReset}>
                返回
              </Button>,
            ]}
          >
            {import.meta.env.MODE === 'development' && this.state.error && (
              <div style={{ 
                textAlign: 'left', 
                padding: '20px', 
                background: '#f5f5f5', 
                borderRadius: '4px',
                marginTop: '20px'
              }}>
                <details style={{ whiteSpace: 'pre-wrap' }}>
                  <summary style={{ 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    color: '#ff4d4f'
                  }}>
                    错误详情（开发模式）
                  </summary>
                  <div style={{ 
                    fontSize: '12px', 
                    fontFamily: 'monospace',
                    color: '#666'
                  }}>
                    <p><strong>错误信息：</strong></p>
                    <p>{this.state.error.toString()}</p>
                    <p><strong>组件堆栈：</strong></p>
                    <p>{this.state.errorInfo?.componentStack}</p>
                  </div>
                </details>
              </div>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
