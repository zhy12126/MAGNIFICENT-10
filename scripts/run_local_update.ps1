[CmdletBinding()]
param(
  [ValidateSet('daily', 'fundamentals')]
  [string]$Mode = 'daily',
  [string]$ApiKey
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
    if ($name.Trim() -eq 'ALPHA_VANTAGE_API_KEY' -and -not $env:ALPHA_VANTAGE_API_KEY) {
      $env:ALPHA_VANTAGE_API_KEY = $value.Trim().Trim('"').Trim("'")
    }
  }
}

Import-LocalEnv (Join-Path $root '.env')
if ($ApiKey) { $env:ALPHA_VANTAGE_API_KEY = $ApiKey }
if (-not $env:ALPHA_VANTAGE_API_KEY) {
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
if ($Mode -eq 'daily') {
  Write-Host "开始本地日更：更新 11 家公司的行情、估值快照和历史曲线。"
  Write-Host "预计使用 22 次 Alpha Vantage 请求；请勿在同一天再运行 fundamentals。" -ForegroundColor Yellow
  & $runner @runnerArgs (Join-Path $PSScriptRoot 'fetch_market_data.py')
} else {
  Write-Host "开始本地财报刷新：更新公司级现金流模型输入。"
  Write-Host "预计使用 22 次 Alpha Vantage 请求；建议在不运行日更的周末执行。" -ForegroundColor Yellow
  & $runner @runnerArgs (Join-Path $PSScriptRoot 'fetch_fundamentals.py')
}

if ($LASTEXITCODE -ne 0) { throw "数据更新失败，退出码：$LASTEXITCODE" }
Write-Host "完成。网页读取的 outputs/data 文件已在本地更新。" -ForegroundColor Green
