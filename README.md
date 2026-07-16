# Market10 日更部署

这是一个静态网页：Cloudflare Pages 提供网页，GitHub Actions 每天收盘后从 Alpha Vantage 生成 `outputs/data/stocks.json`。

## 首次配置

1. 创建 GitHub 仓库并推送本目录。
2. 在仓库 **Settings → Secrets and variables → Actions** 新建 secret：`ALPHA_VANTAGE_API_KEY`。
3. 在 **Actions → Update market data → Run workflow** 手动运行一次，生成首份真实数据。
4. Cloudflare Pages 中连接该 GitHub 仓库，构建设置选择：
   - Build command：留空
   - Build output directory：`outputs`
5. 每个交易日 UTC 22:30，Action 会更新数据并触发 Cloudflare Pages 重新发布。

## 数据口径

- Alpha Vantage 免费 Key 每日最多 25 次请求；本工作流每天 20 次。
- `收入同比（最近）` 是最新披露季度的收入同比，不是分析师预测。
- `市现率` 在免费 25 次/日额度内无法可靠同时取得，暂显示 `—`；要补齐可使用付费数据源或降低其他调用。
- `隐含增长率` 使用 9% 折现率、3% 永续增长率、按公司设定的目标自由现金流率，反向计算未来五年收入 CAGR。
