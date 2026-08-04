# HY 的个人工具小站

这是一个由个人开发和维护的 Web 工具小站，用来整理我长期关注的数据，并把复杂信息转换成更容易理解的图表和分析。项目目前包含“巨头估值”和“人民币/日元汇率分析”两个板块。

网站采用静态部署方案：Cloudflare Pages 提供网页，GitHub Actions 负责定时更新数据。所有结果仅用于个人研究与信息参考，不构成投资、交易或换汇建议。

## 巨头估值

巨头估值板块关注美国大型科技公司和半导体产业链，帮助快速了解：

- 主要公司的市值、估值水平、收入增长和现金流表现；
- 当前估值相对于历史区间所处的位置；
- 市场价格隐含了怎样的未来增长预期；
- MAG7 与半导体产业链在标普 500 中的集中度变化。

公司日度快照主要来自 Finviz；公司级财报模型使用 Alpha Vantage 财报接口，历史财务数据可通过 SEC EDGAR 回填；标普 500 集中度使用 State Street 每日披露的 SPY 持仓作为可审计代理。数据缺失时页面保留空值，不使用模拟数据补齐。

## 人民币/日元汇率分析

汇率分析板块不是实时外汇报价工具，也不预测日元或人民币未来一定上涨或下跌。它主要回答：

- 一段时间内人民币兑日元发生了怎样的变化；
- 变化主要来自日元侧，还是人民币侧；
- USD/JPY 与 USD/CNY 分别贡献了多少；
- 哪些经济数据、政策和资金流线索与这段行情一致；
- 未来30天有哪些值得留意的官方事件。

`Update yen analysis data` 工作流从欧洲央行（ECB）取得同日 EUR/USD、EUR/JPY 与 EUR/CNY 参考汇率，由此推导 USD/JPY、USD/CNY 和 CNY/JPY；如果 ECB 数据不可用，则更新失败并报错，不回退到 FRED。结果写入 `outputs/data/yen-rates.json`。这些数据属于日频研究数据，不是实时成交报价。

未来事件日历由 `outputs/data/yen-events-source.json` 中经过人工核对的官方日程生成。`scripts/build_yen_events.py` 会校验官方域名、移除过期事件，并生成未来30天的 `outputs/data/yen-events.json`。新增或调整事件时，需要先依据发布机构官网修改 source 文件并更新 `reviewedThrough`，不从第三方财经日历自动推断。

本地更新汇率分析数据无需 API Key，可以双击 `scripts/run_yen_update.cmd`，或在项目根目录运行：

```powershell
.\scripts\run_yen_update.ps1
```

脚本会校验生成的JSON并显示最新共同交易日及三组汇率。网络失败时不会覆盖已有的 `yen-rates.json`。

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
2. 将 `.env.example` 复制为 `.env`，填入 `ALPHA_VANTAGE_API_KEY`，供每周财报检查与少数专项历史重建使用；`.env` 已被 Git 忽略，不会上传。日更本身不读取该 Key。
3. 在项目根目录执行：

   ```powershell
   .\scripts\run_local_update.ps1 -Mode daily
   ```

   或双击/命令行运行 `scripts\run_local_update.cmd`。

`daily` 从 Yahoo Finance EOD 读取实际交易日与收盘价，从 Finviz 读取 Forward P/E、PEG、EV/EBITDA 等补充指标；SKHY 的行情同样使用 Yahoo Finance。数据源临时不可用时保留最近一次有效快照。它会更新 `stocks.json`、`history.json` 和 `concentration.json`，供本地网页立即读取。`fundamentals` 会更新公司级现金流模型输入：

Trailing P/E、P/CF、P/S 不直接采用 Finviz：每日点复用历史回填最近一期已披露
TTM 的每股分母，并使用 Yahoo EOD 返回的实际交易日期和收盘价。Finviz 仅继续提供
Forward P/E、PEG、EV/EBITDA 等补充指标。周末运行不会生成虚假的周末历史点。

```powershell
.\scripts\run_local_update.ps1 -Mode validate
```

该命令会清理非交易日、已移除代码及没有 `ttmPeriodEnd` 的旧估值，并检查当前快照和
同日历史点的 P/E、P/CF、P/S 与财报期间是否一致。

```powershell
.\scripts\run_local_update.ps1 -Mode fundamentals
```

### 免费个股历史估值回填

SKHY 不走 SEC Company Facts 的美股通用回填。它使用独立命令读取韩国主上市
`000660.KS` 的 K-IFRS 合并财报和股价，并按 **1 股普通股 = 10 ADS** 换算：

```powershell
.\scripts\run_local_update.ps1 -Mode skhy-history
.\scripts\run_local_update.ps1 -Mode skhy-fundamentals
```

2026-07-10 起使用 SKHY 的实际 Nasdaq 收盘价；此前数据会以
`underlying-ads-equivalent-proxy` 明确标记为韩国普通股折算的 ADS 等价代理，不会冒充
SKHY 的真实成交价。脚本只覆盖 `history.json` 中的 `SKHY` 数组，不修改其他股票。
财报命令只替换 `fundamentals.json` 和 `stocks.json` 中的 SKHY 公司模型；收入、净利润、
经营现金流和资本开支取 `000660.KS` 的 K-IFRS 合并报表，最近四季形成 TTM，三年年度
FCF 利润率用于周期归一化，之后按最新 KRW/USD 汇率换成模型使用的美元。

在 `.env` 中增加 `SEC_EDGAR_USER_AGENT`（描述 + 真实联系邮箱）后，可通过 SEC EDGAR 的季度公开财报（最近四季滚动汇总，TTM）和历史日收盘价，回填详情页最近五年的 P/E、P/CF、P/S：

```powershell
.\scripts\run_local_update.ps1 -Mode history
```

GitHub 上的 `Refresh company fundamentals` 每周检查通用公司和 SKHY 的最新财报；发现财报期变化时，会自动回填美国公司、TSM 与 SKHY 各自的历史估值，再执行一致性验证。SKHY 始终使用独立 K-IFRS 路径，不进入美国公司的 SEC 通用逻辑。`Backfill free valuation history` 会在每月第一个周一进行一次全量历史审计，也可手动运行。

若要免费回填 Stooq 的五年日收盘价，即使 `.env` 中已配置 EODHD Key，也可明确指定：

```powershell
.\scripts\run_local_update.ps1 -Mode history -PriceSource stooq
```

这会覆盖同日期的历史估值点，不会伪造 Forward PE；历史 Forward PE 需要带时间戳的分析师一致预期数据。每一个交易日的分母均使用当日已经披露的最近四个季度 TTM，且以这四个季度的平均稀释加权股数换算为每股指标；因此不会在财报披露日前提前使用新数据。每条记录还会保存 `ttmPeriodEnd` 与 `ttmAvailableFrom`，可用于核查口径。若在 `.env` 配置 `EODHD_API_KEY`，价格优先使用 EODHD 的调整后 EOD 收盘价；否则使用 Stooq，Stooq 返回空数据时回退 Yahoo Finance。后两者是低频本地回填的兼容措施，不应视为有 SLA 的商业数据授权。GitHub 部署时，在 **Settings → Secrets and variables → Actions** 新建 `SEC_EDGAR_USER_AGENT`（以及可选的 `EODHD_API_KEY`）。该工作流每月第一个周一自动执行，也可在 Actions 页面手动运行。若 SEC 或价格源缺少某美股代码，页面会保留空值，不混用其他市场数据。

Alpha Vantage 免费 Key 每天限额约 25 次请求。通用 `fundamentals` 使用 22 次请求；财报变化时 TSM 专项历史重建再使用 3 次，合计不超过 25 次。SKHY 专用更新和 `daily` 不使用该 Key。

## 数据口径

- Alpha Vantage 免费 Key 每日最多约 25 次请求；通用财报检查使用 22 次，必要时 TSM 历史重建使用另外 3 次。
- `收入同比（最近）` 是最新披露季度的收入同比，不是分析师预测。
- `市现率` 在免费 25 次/日额度内无法可靠同时取得，暂显示 `—`；要补齐可使用付费数据源或降低其他调用。
- `隐含增长率` 是公司级反向 FCFE：基于各公司最近四季收入、经营现金流、资本开支、三年现金流率中位数和该股 Beta，反向计算未来五年收入 CAGR；不会使用行业统一自由现金流率。
- 每周日，`Refresh company fundamentals` 会检查 11 家通用公司的 Alpha Vantage 财报，并通过独立 K-IFRS 路径检查 SKHY；只有财报期发生变化才回填相关历史估值。每日行情更新后会强制执行快照/历史一致性验证，验证失败不会提交数据。
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
