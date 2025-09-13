@echo off
echo 🚀 Iniciando Stock Control en modo desarrollo...

REM Verificar que Docker Desktop esté ejecutándose
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker no está ejecutándose. Por favor, inicia Docker Desktop.
    pause
    exit /b 1
)

REM Crear directorio para base de datos si no existe
if not exist "data" mkdir data

REM Iniciar servicios con docker-compose
echo 📦 Iniciando base de datos...
docker compose up -d postgres

REM Esperar a que PostgreSQL esté listo
echo ⏳ Esperando a que PostgreSQL esté listo...
timeout /t 5 /nobreak >nul

:wait_postgres
docker compose exec postgres pg_isready -U admin >nul 2>&1
if %errorlevel% neq 0 (
    echo ⏳ Esperando PostgreSQL...
    timeout /t 2 /nobreak >nul
    goto wait_postgres
)

echo ✅ PostgreSQL está listo!

REM Aplicar migraciones
echo 📊 Aplicando migraciones...
cd backend
call npm run db:push
cd ..

REM Ejecutar seed (opcional)
set /p seed=¿Quieres ejecutar el seed de datos? (y/n): 
if /i "%seed%"=="y" (
    echo 🌱 Ejecutando seed...
    cd backend
    call npm run db:seed
    cd ..
)

echo 🎉 Base de datos configurada!
echo.
echo 📋 Para desarrollo manual:
echo   Backend: cd backend ^&^& npm run dev
echo   Frontend: cd frontend ^&^& npm run dev
echo.
echo 🌐 URLs locales:
echo   Frontend: http://localhost:3000
echo   Backend: http://localhost:4000
echo   Health: http://localhost:4000/api/health
echo   PgAdmin: http://localhost:5050 (admin@localhost.com / admin123)
echo.
echo Presiona cualquier tecla para detener los servicios...
pause >nul

echo 🛑 Deteniendo servicios...
docker compose down