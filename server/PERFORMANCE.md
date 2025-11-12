# 性能监控文档

## 功能概述

系统已集成请求耗时监控功能，自动记录所有 API 请求的响应时间，并对慢请求进行告警。

## 监控指标

### 1. 请求耗时记录
所有请求的响应时间都会被记录在日志中：

```
2025-11-12 23:30:15 - INFO - GET /materials - 200 - 0.123s
2025-11-12 23:30:16 - INFO - POST /materials/in - 200 - 0.456s
```

### 2. 慢请求告警
当请求耗时超过阈值时，会记录警告日志：

```
2025-11-12 23:30:20 - WARNING - 慢请求告警: GET /products/export - 耗时: 2.345s | IP: 127.0.0.1 | 阈值: 1.0s
```

### 3. 响应时间头
每个响应都会包含 `X-Response-Time` 头，方便前端监控：

```http
HTTP/1.1 200 OK
X-Response-Time: 0.123s
Content-Type: application/json
```

## 配置选项

### 环境变量配置

在 `.env.development` 或 `.env.production` 中配置：

```bash
# 慢请求阈值（秒），默认 1.0
SLOW_REQUEST_THRESHOLD=1.0

# 是否添加响应时间头，默认 True
ENABLE_RESPONSE_TIME_HEADER=True
```

### 代码配置

在 `server/config.py` 中：

```python
class Config:
    # 性能监控配置
    SLOW_REQUEST_THRESHOLD = float(os.getenv('SLOW_REQUEST_THRESHOLD', 1.0))
    ENABLE_RESPONSE_TIME_HEADER = os.getenv('ENABLE_RESPONSE_TIME_HEADER', 'True').lower() == 'true'
```

## API 接口

### 健康检查
```bash
GET /health

# 响应
{
  "status": "healthy",
  "timestamp": "2025-11-12T23:30:00",
  "version": "1.0.0",
  "service": "ESSU"
}
```

用于负载均衡器、监控系统等检查服务是否正常运行。

## 日志分析

### 查看慢请求
```bash
# 查看所有慢请求
grep "慢请求告警" logs/essu.log

# 查看今天的慢请求
grep "慢请求告警" logs/essu.log | grep "2025-11-12"

# 统计慢请求数量
grep "慢请求告警" logs/essu.log | wc -l

# 查看最慢的10个请求
grep "慢请求告警" logs/essu.log | sort -t: -k4 -rn | head -10
```

### 分析请求耗时分布
```bash
# 提取所有请求耗时
grep -oP '\d+\.\d+s$' logs/essu.log | sort -n

# 计算平均响应时间（需要 awk）
grep -oP '\d+\.\d+(?=s$)' logs/essu.log | awk '{sum+=$1; count++} END {print sum/count}'
```

## 性能优化建议

### 常见慢请求原因

1. **数据库查询慢**
   - 添加索引
   - 优化查询语句
   - 使用分页

2. **大量数据导出**
   - 使用流式导出
   - 添加后台任务
   - 限制导出数量

3. **外部 API 调用**
   - 添加超时设置
   - 使用缓存
   - 异步处理

4. **文件处理**
   - 优化图片处理
   - 使用 CDN
   - 压缩文件

### 优化示例

**添加数据库索引：**
```python
# 在 models.py 中
class Material(Base):
    __tablename__ = 'materials'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), index=True)  # 添加索引
```

**使用缓存：**
```python
from functools import lru_cache

@lru_cache(maxsize=128)
def get_material_by_id(material_id):
    # 缓存查询结果
    pass
```

**异步处理：**
```python
from threading import Thread

def async_export(data):
    # 后台导出
    pass

@app.route('/export')
def export_data():
    Thread(target=async_export, args=(data,)).start()
    return jsonify({'success': True, 'message': '导出任务已启动'})
```

## 生产环境建议

### 1. 使用专业监控工具
- **Prometheus + Grafana**: 指标收集和可视化
- **ELK Stack**: 日志分析
- **APM 工具**: New Relic, DataDog 等

### 2. 设置告警
```python
# 示例：发送告警到钉钉/企业微信
def send_alert(message):
    # 发送告警通知
    pass

if elapsed > Config.SLOW_REQUEST_THRESHOLD * 2:  # 超过阈值2倍
    send_alert(f'严重慢请求: {request.path} - {elapsed}s')
```

### 3. 定期分析
- 每周查看慢请求报告
- 分析性能趋势
- 优化热点接口

### 4. 压力测试
```bash
# 使用 Apache Bench
ab -n 1000 -c 10 http://localhost:5274/materials

# 使用 wrk
wrk -t4 -c100 -d30s http://localhost:5274/materials
```

## 前端集成

### 读取响应时间
```javascript
// 在 axios 拦截器中
axiosInstance.interceptors.response.use(
  (response) => {
    const responseTime = response.headers['x-response-time'];
    if (responseTime) {
      console.log(`API 响应时间: ${responseTime}`);
      
      // 慢请求提示
      const time = parseFloat(responseTime);
      if (time > 2.0) {
        message.warning('网络较慢，请稍候...');
      }
    }
    return response;
  }
);
```

## 总结

性能监控功能已集成到系统中，通过日志记录和响应头提供了基础的性能监控能力。对于生产环境，建议结合专业的 APM 工具进行更深入的性能分析和优化。
