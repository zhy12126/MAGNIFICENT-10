[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$outputPath = Join-Path $projectRoot 'outputs\data\yen-rates.json'
$fetchScript = Join-Path $PSScriptRoot 'fetch_yen_rates.py'
$eventScript = Join-Path $PSScriptRoot 'build_yen_events.py'
$eventOutputPath = Join-Path $projectRoot 'outputs\data\yen-events.json'

if (-not (Test-Path -LiteralPath $fetchScript)) {
  throw "找不到汇率更新程序：$fetchScript"
}
if (-not (Test-Path -LiteralPath $eventScript)) {
  throw "找不到事件日历更新程序：$eventScript"
}

$pyLauncher = Get-Command py -ErrorAction SilentlyContinue
$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
if ($pyLauncher) {
  $pythonRunner = $pyLauncher.Source
  $pythonArgs = @('-3')
} elseif ($pythonCommand) {
  $pythonRunner = $pythonCommand.Source
  $pythonArgs = @()
} else {
  throw '未找到 Python 3。请安装 Python 3.11+，安装时勾选 Add Python to PATH，然后重试。'
}

$previousWriteTime = $null
if (Test-Path -LiteralPath $outputPath) {
  $previousWriteTime = (Get-Item -LiteralPath $outputPath).LastWriteTimeUtc
}

Write-Host '开始更新人民币兑日元分析数据……'
Write-Host '数据源：优先使用ECB每日参考汇率；连接失败时回退FRED。' -ForegroundColor DarkGray
Write-Host '数据口径：日频研究数据，不是实时成交报价。' -ForegroundColor Yellow

Push-Location $projectRoot
try {
  & $pythonRunner @pythonArgs $fetchScript
  if ($LASTEXITCODE -ne 0) {
    throw "汇率更新程序退出，错误码：$LASTEXITCODE"
  }
  Write-Host '开始整理未来30天官方事件日历……'
  & $pythonRunner @pythonArgs $eventScript
  if ($LASTEXITCODE -ne 0) {
    throw "事件日历更新程序退出，错误码：$LASTEXITCODE"
  }
} finally {
  Pop-Location
}

if (-not (Test-Path -LiteralPath $outputPath)) {
  throw '更新结束后仍未生成 outputs/data/yen-rates.json，请检查网络连接和FRED访问状态。'
}
if (-not (Test-Path -LiteralPath $eventOutputPath)) {
  throw '更新结束后仍未生成 outputs/data/yen-events.json。'
}

$outputFile = Get-Item -LiteralPath $outputPath
if ($previousWriteTime -and $outputFile.LastWriteTimeUtc -eq $previousWriteTime) {
  Write-Warning '本次没有取得新数据，网页将继续使用上一版 yen-rates.json。请检查上方的网络错误信息。'
}

try {
  $snapshot = Get-Content -LiteralPath $outputPath -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
  throw 'yen-rates.json 已生成，但JSON格式校验失败。'
}

if ($snapshot.schemaVersion -ne 1 -or -not $snapshot.latestCommonDate -or -not $snapshot.periods -or -not $snapshot.attribution) {
  throw 'yen-rates.json 缺少必要字段，拒绝将其视为有效更新。'
}

Write-Host ''
Write-Host '日元分析数据更新完成。' -ForegroundColor Green
Write-Host "数据截至：$($snapshot.latestCommonDate)"
Write-Host "实际数据源：$($snapshot.source.provider)"
Write-Host "USD/JPY：$([math]::Round([double]$snapshot.latest.usdjpy, 4))"
Write-Host "USD/CNY：$([math]::Round([double]$snapshot.latest.usdcny, 4))"
Write-Host "CNY/JPY：$([math]::Round([double]$snapshot.latest.cnyjpy, 4))"
Write-Host "输出文件：$outputPath" -ForegroundColor DarkGray
try {
  $eventSnapshot = Get-Content -LiteralPath $eventOutputPath -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
  throw 'yen-events.json 已生成，但JSON格式校验失败。'
}
if ($eventSnapshot.schemaVersion -ne 1 -or $null -eq $eventSnapshot.events) {
  throw 'yen-events.json 缺少必要字段。'
}
Write-Host "未来事件：$($eventSnapshot.events.Count) 条（未来$($eventSnapshot.windowDays)天）"
Write-Host "事件文件：$eventOutputPath" -ForegroundColor DarkGray
