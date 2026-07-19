@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run_yen_update.ps1"
set "YEN_UPDATE_EXIT=%ERRORLEVEL%"
echo.
if not "%YEN_UPDATE_EXIT%"=="0" (
  echo 更新失败，请查看上方错误信息。
) else (
  echo 可以刷新网页查看最新汇率数据。
)
pause
exit /b %YEN_UPDATE_EXIT%
