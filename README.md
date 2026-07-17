# Market10 日更部署

这是一个静态网页：Cloudflare Pages 提供网页，GitHub Actions 每天收盘后从 Alpha Vantage 生成公司快照，并从 State Street 的 SPY 每日持仓生成集中度数据。

## 首次配置

1. 创建 GitHub 仓库并推送本目录。
2. 在仓库 **Settings → Secrets and variables → Actions** 新建 secret：`ALPHA_VANTAGE_API_KEY`。
3. 在 **Actions → Update market data → Run workflow** 手动运行一次，生成首份真实数据。
4. Cloudflare Pages 中连接该 GitHub 仓库，构建设置选择：
   - Build command：留空
   - Build output directory：`outputs`
5. 每个交易日 UTC 22:30，Action 会更新数据并触发 Cloudflare Pages 重新发布。

## 本地更新测试

本地更新与 GitHub Action 使用同一套 Python 脚本，但不会连接 GitHub。

1. 安装 Python 3.11 或更高版本（安装时勾选 **Add Python to PATH**）。
2. 将 `.env.example` 复制为 `.env`，填入 `ALPHA_VANTAGE_API_KEY`；`.env` 已被 Git 忽略，不会上传。
3. 在项目根目录执行：

   ```powershell
   .\scripts\run_local_update.ps1 -Mode daily
   ```

   或双击/命令行运行 `scripts\run_local_update.cmd`。

`daily` 会更新 `stocks.json`、`history.json` 和 `concentration.json`，供本地网页立即读取。`fundamentals` 会更新公司级现金流模型输入：

```powershell
.\scripts\run_local_update.ps1 -Mode fundamentals
```

### 免费个股历史估值回填

在 `.env` 中增加 `SEC_EDGAR_USER_AGENT`（描述 + 真实联系邮箱）后，可通过 SEC EDGAR 的季度公开财报（最近四季滚动汇总，TTM）和历史日收盘价，回填详情页最近五年的 P/E、P/CF、P/S：

```powershell
.\scripts\run_local_update.ps1 -Mode history
```

若要免费回填 Stooq 的五年日收盘价，即使 `.env` 中已配置 EODHD Key，也可明确指定：

```powershell
.\scripts\run_local_update.ps1 -Mode history -PriceSource stooq
```

这会覆盖同日期的历史估值点，不会伪造 Forward PE；历史 Forward PE 需要带时间戳的分析师一致预期数据。每一个交易日的分母均使用当日已经披露的最近四个季度 TTM，且以这四个季度的平均稀释加权股数换算为每股指标；因此不会在财报披露日前提前使用新数据。每条记录还会保存 `ttmPeriodEnd` 与 `ttmAvailableFrom`，可用于核查口径。若在 `.env` 配置 `EODHD_API_KEY`，价格优先使用 EODHD 的调整后 EOD 收盘价；否则使用 Stooq，Stooq 返回空数据时回退 Yahoo Finance。后两者是低频本地回填的兼容措施，不应视为有 SLA 的商业数据授权。GitHub 部署时，在 **Settings → Secrets and variables → Actions** 新建 `SEC_EDGAR_USER_AGENT`（以及可选的 `EODHD_API_KEY`），随后在 **Actions → Backfill free valuation history → Run workflow** 手动执行一次。该工作流不设定时任务。若 SEC 或价格源缺少某美股代码，页面会保留空值，不混用其他市场数据。

Alpha Vantage 免费 Key 每天限额约 25 次请求。两个模式各使用约 24 次请求，因此不要在同一天连续运行；日更适合交易日测试，财报刷新适合周末测试。GitHub Action 仍会照常保留。

## 数据口径

- Alpha Vantage 免费 Key 每日最多 25 次请求；本工作流每天 24 次。
- `收入同比（最近）` 是最新披露季度的收入同比，不是分析师预测。
- `市现率` 在免费 25 次/日额度内无法可靠同时取得，暂显示 `—`；要补齐可使用付费数据源或降低其他调用。
- `隐含增长率` 是公司级反向 FCFE：基于各公司最近四季收入、经营现金流、资本开支、三年现金流率中位数和该股 Beta，反向计算未来五年收入 CAGR；不会使用行业统一自由现金流率。
- 每月首个周六，`Refresh company fundamentals` 会使用 24 次免费 API 调用更新 `outputs/data/fundamentals.json`，不与工作日的 24 次日更调用冲突。部署后请先在 GitHub Actions 手动运行一次该工作流，再运行 `Update market data`。
- 对公开财报不足四个季度或三年可比现金流的公司，隐含增长率显示 `—`，不会补造行业假设。
- `outputs/data/history.json` 由日更任务累积真实 PE、Forward PE 与 P/S 快照；详情页的 1 年、3 年、5 年、10 年筛选均只展示这些真实快照。首次部署前的历史不会用模拟数据补齐。
- 首页的 MAG7 与半导体产业链集中度使用 State Street 每日披露的 SPY 持仓权重，作为标普 500 的可审计代理。半导体篮子覆盖 NVIDIA、Broadcom、AMD、Qualcomm、Texas Instruments、Applied Materials、Lam Research、KLA、ADI、Micron、Western Digital、SanDisk、Marvell、ON Semiconductor、Microchip 等设计、设备、存储和通信芯片公司；仅计入当天确实在 SPY 持仓内的标的。TSMC 不属于这个美国指数篮子，因此不计入该比例。

## 纳斯达克 100 数据格式

纳斯达克页读取可选文件 `outputs/data/nasdaq.json`。估值图推荐使用统一时间序列；三个指标可在页面中单独勾选：

```json
{
  "valuationHistory": [
    {"date": "2025-01-31", "pe": 29.4, "forwardPe": 24.1, "pb": 5.8}
  ],
  "concentrationHistory": [
    {"date": "2025-01-31", "concentration": 48.2}
  ]
}
```

也兼容原先分开的 `peHistory`、`forwardPeHistory` 和 `pbHistory`。不要填入模拟值；缺少的真实指标会在页面显示“等待数据”。
