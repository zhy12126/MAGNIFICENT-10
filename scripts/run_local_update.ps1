[CmdletBinding()]
param(
  [ValidateSet('daily', 'skhy', 'fundamentals', 'history', 'spy', 'rebuild-selected-history', 'verified-amd-history', 'verified-tsm-history')]
  [string]$Mode = 'daily',
  [string]$ApiKey,
  [ValidateSet('auto', 'stooq', 'eodhd')]
  [string]$PriceSource = 'auto'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

function Import-LocalEnv {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return }
  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#') -or -not $line.Contains('=')) { return }
    $name, $value = $line -split '=', 2
    if ($name.Trim() -in @('ALPHA_VANTAGE_API_KEY', 'SEC_EDGAR_USER_AGENT', 'EODHD_API_KEY', 'HISTORICAL_PRICE_SOURCE') -and -not (Get-Item "Env:$($name.Trim())" -ErrorAction SilentlyContinue)) {
      Set-Item "Env:$($name.Trim())" $value.Trim().Trim('"').Trim("'")
    }
  }
}

Import-LocalEnv (Join-Path $root '.env')
if ($ApiKey) { $env:ALPHA_VANTAGE_API_KEY = $ApiKey }
if ($PriceSource -ne 'auto') { $env:HISTORICAL_PRICE_SOURCE = $PriceSource }
if ($Mode -in @('fundamentals', 'rebuild-selected-history', 'verified-tsm-history') -and -not $env:ALPHA_VANTAGE_API_KEY) {
  throw "找不到 Alpha Vantage Key。请复制 .env.example 为 .env 并填入 ALPHA_VANTAGE_API_KEY，或运行时传入 -ApiKey。"
}

$py = Get-Command py -ErrorAction SilentlyContinue
$python = Get-Command python -ErrorAction SilentlyContinue
if ($py) {
  $runner = $py.Source
  $runnerArgs = @('-3')
} elseif ($python) {
  $runner = $python.Source
  $runnerArgs = @()
} else {
  throw "未找到 Python 3。请安装 Python 3.11+，安装时勾选 Add Python to PATH，然后重试。"
}

Set-Location $root
switch ($Mode) {
  'daily' {
    Write-Host "开始本地日更：更新 12 家公司的行情、估值快照和历史曲线，并刷新 SPY 权重及每份额篮子价值。"
    Write-Host "读取 Finviz 当日行情与估值快照；SKHY 在 Finviz 不可用时回退 Yahoo Finance。" -ForegroundColor Yellow
    & $runner @runnerArgs (Join-Path $PSScriptRoot 'fetch_market_data.py')
  }
  'skhy' {
    $env:MARKET_TICKERS = 'SKHY'
    Write-Host "开始仅刷新 SK hynix（SKHY）行情与基本面快照。" -ForegroundColor Cyan
    Write-Host "数据源：Yahoo Finance；不调用 Alpha Vantage，不会改动其他公司数据。" -ForegroundColor Yellow
    # In PowerShell 7, a missing Python module writes stderr that can be
    # promoted to a terminating NativeCommandError by $ErrorActionPreference.
    # Probe it with non-terminating handling, then install when absent.
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & $runner @runnerArgs '-c' 'import yfinance' 2>$null
    $yfinanceAvailable = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = $previousErrorActionPreference
    if (-not $yfinanceAvailable) {
      Write-Host "首次使用：安装 Yahoo Finance 连接依赖 yfinance..." -ForegroundColor Yellow
      & $runner @runnerArgs '-m' 'pip' 'install' '--disable-pip-version-check' 'yfinance'
      if ($LASTEXITCODE -ne 0) { throw "无法安装 yfinance。请检查网络后重试：py -3 -m pip install yfinance" }
    }
    & $runner @runnerArgs (Join-Path $PSScriptRoot 'fetch_market_data.py')
  }
  'fundamentals' {
    Write-Host "开始本地财报刷新：更新公司级现金流模型输入。"
    Write-Host "预计使用 24 次 Alpha Vantage 请求；建议在不运行日更的周末执行。" -ForegroundColor Yellow
    & $runner @runnerArgs (Join-Path $PSScriptRoot 'fetch_fundamentals.py')
    if ($LASTEXITCODE -eq 0) {
      Write-Host "同步最新财报输入到网页快照..." -ForegroundColor Cyan
      & $runner @runnerArgs (Join-Path $PSScriptRoot 'sync_fundamentals_to_stocks.py')
    }
  }
  'spy' {
    Write-Host "开始仅刷新 SPY 权重与每份额篮子价值。" -ForegroundColor Cyan
    Write-Host "预计使用 1 次 Alpha Vantage 请求；不会更新公司行情或基本面。" -ForegroundColor Yellow
    & $runner @runnerArgs (Join-Path $PSScriptRoot 'fetch_spy_concentration.py')
  }
  'history' {
    if (-not $env:SEC_EDGAR_USER_AGENT) { throw "找不到 SEC 联系方式。请在 .env 中填入 SEC_EDGAR_USER_AGENT，例如 Market10 your-email@example.com。" }
    Write-Host "开始从 SEC EDGAR 财报 TTM + 历史 EOD 收盘价回填五年 P/E、P/CF 与 P/S；不会运行 Alpha Vantage。" -ForegroundColor Yellow
    if ($env:HISTORICAL_PRICE_SOURCE -eq 'stooq') { Write-Host "价格源：强制使用 Stooq；无数据时回退 Yahoo Finance。" -ForegroundColor Yellow } elseif ($env:EODHD_API_KEY) { Write-Host "价格源：EODHD adjusted EOD。可传入 -PriceSource stooq 强制使用免费 Stooq。" -ForegroundColor Yellow } else { Write-Host "价格源：Stooq；无数据时回退 Yahoo Finance。可在 .env 配置 EODHD_API_KEY 使用商业 EOD。" -ForegroundColor Yellow }
    & $runner @runnerArgs (Join-Path $PSScriptRoot 'fetch_free_valuation_history.py')
  }
  'rebuild-selected-history' {
    Write-Host "重建 AMD、TSM、SKHY 的历史价格；重建 AMD、TSM 的 TTM 历史估值。" -ForegroundColor Cyan
    Write-Host "SKHY 仅保留 2026-07-10 美股 ADR 上市后的真实数据；预计使用 9 次 Alpha Vantage 请求。" -ForegroundColor Yellow
    & $runner @runnerArgs (Join-Path $PSScriptRoot 'rebuild_selected_history.py')
  }
  'verified-amd-history' {
    if (-not $env:SEC_EDGAR_USER_AGENT) { throw "找不到 SEC 联系方式。请在 .env 中填入 SEC_EDGAR_USER_AGENT。" }
    $env:HISTORY_TICKERS = 'AMD'
    Write-Host "从 SEC EDGAR 重建 AMD 的逐季披露 TTM 历史估值；不调用 Alpha Vantage。" -ForegroundColor Cyan
    & $runner @runnerArgs (Join-Path $PSScriptRoot 'fetch_free_valuation_history.py')
  }
  'verified-tsm-history' {
    $env:REBUILD_TICKERS = 'TSM'
    Write-Host "按 TSMC 的 ADS EPS、普通股数及台币/美元换算重建 TSM 历史估值。" -ForegroundColor Cyan
    Write-Host "预计使用 3 次 Alpha Vantage 请求；不会更新 AMD 或 SKHY。" -ForegroundColor Yellow
    & $runner @runnerArgs (Join-Path $PSScriptRoot 'rebuild_selected_history.py')
  }
}

if ($LASTEXITCODE -ne 0) { throw "数据更新失败，退出码：$LASTEXITCODE" }
Write-Host "完成。网页读取的 outputs/data 文件已在本地更新。" -ForegroundColor Green
