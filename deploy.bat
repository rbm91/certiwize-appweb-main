@echo off
echo ========================================
echo   CertiWize - Deploy to Production
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Staging des fichiers...
git add -A

echo [2/3] Commit...
git commit -m "deploy: mise a jour production" --allow-empty

echo [3/3] Push vers GitHub (Vercel auto-deploy)...
git push origin master

echo.
echo ========================================
echo   Deploiement lance ! Vercel build en cours.
echo   https://vercel.com/rudys-projects-88eac042
echo ========================================
pause
