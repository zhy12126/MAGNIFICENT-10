# Alpha Vantage API 日限额超出问题修复

## 问题分析

工作流在周日执行时超过了Alpha Vantage免费API的**30次/天限制**：

### API调用统计
| 工作流运行 | 脚本 | 调用方式 | 次数 | 总计 |
|---------|------|--------|-----|-----|
| **周日** | fetch_fundamentals.py | 11 ticker × 2 calls | 22次 | **31次** ❌ |
| | rebuild_selected_history.py | 3 ticker × 3 calls | 9次 | |
| **周一** | fetch_fundamentals.py | 6 ticker × 2 calls | 12次 | **21次** ✓ |
| | rebuild_selected_history.py | 3 ticker × 3 calls | 9次 | |

**根本原因**：周日的 22 + 9 = 31 次调用，超过了30次的限制

---

## 解决方案

### 方案1：工作流调度优化

添加**周二单独运行**，专门处理历史重建，避免与主抓取任务的同日冲突。

**修改：**.github/workflows/refresh-fundamentals.yml

#### 1.1 增加周二的计划任务
```yaml
schedule:
  - cron: '15 01 * * 0'  # 周日：抓取11个主要公司（22次）
  - cron: '15 01 * * 1'  # 周一：抓取6个次要公司（12次）
  - cron: '15 02 * * 2'  # 周二：仅处理历史重建（9次）
```

#### 1.2 分离步骤执行
| 运行 | fetch_fundamentals | 历史重建 | 说明 |
|-----|-------------------|--------|------|
| 周日 | ✓ | ✗ | 禁用条件步骤 |
| 周一 | ✓ | ✗ | 禁用条件步骤 |
| 周二 | ✗ | ✓ | 仅运行重建 |

**条件修改**：
```yaml
if: github.event.schedule != '15 02 * * 2'           # 周日/周一：跳过此步
if: steps.changed.outputs.xxx_changed == 'true' && github.event.schedule != '15 01 * * 0'
                                                   # 周日：跳过历史重建
```

### 方案2：脚本容错改进

改进 `scripts/fetch_fundamentals.py` 的错误处理：

**修改特点**：

1. ✅ **部分成功支持**：即使部分API调用超限，已获取的公司数据也会保存
   ```python
   if refreshed_tickers:
       # 保存已成功的结果
       print(f"Refreshed {len(refreshed_tickers)}/{len(REQUESTED_TICKERS)} companies")
   ```

2. ✅ **速率限制检测**：改进API错误消息中的速率限制识别
   ```python
   is_rate_limit = any(x in message_lower for x in 
       ["call", "limit", "quota", "per", "request", "busy"])
   ```

3. ✅ **详细的日志输出**：区分API调用失败的不同原因
   ```
   Refreshed 10/11 companies: NVDA,AAPL,MSFT,...
   ⚠️  1 company unavailable (likely API rate limit): TSM
   ```

4. ✅ **工作流容错**：主步骤添加 `continue-on-error: true`，允许分部分成功

---

## 实施效果

### 新的调用模式
```
周日 01:15 UTC → fetch_fundamentals (22 calls) ✓
             → （无历史重建）
             
周一 01:15 UTC → fetch_fundamentals (12 calls) ✓
             → （无历史重建）
             
周二 02:15 UTC → 无 fetch_fundamentals
             → rebuild_selected_history (9 calls, if changed) ✓
```

### 优势
- ✅ 所有日程运行都在30次限制内
- ✅ 新财报仍会在周二被处理
- ✅ 部分API失败不再中断整个工作流
- ✅ 更清晰的错误提示

### 回退方案
如果周二的构建仍然超限（极少情况），可以：
1. 进一步减少ticker数量
2. 购买付费API配额
3. 使用其他数据源（如Yahoo Finance/SEC EDGAR）

---

## 验证方式

**提交前检查**：
```bash
# Python语法验证
python -m py_compile scripts/fetch_fundamentals.py

# 首次手动测试（可选）
python scripts/fetch_fundamentals.py
```

**部署后观察**：
- 监控周日的工作流日志，确保无"Rate limit"错误
- 检查周二的工作流是否正常执行历史重建
- 验证 `outputs/data/fundamentals.json` 的更新时间戳

---

## 相关文件
- [.github/workflows/refresh-fundamentals.yml](.github/workflows/refresh-fundamentals.yml)
- [scripts/fetch_fundamentals.py](scripts/fetch_fundamentals.py)
