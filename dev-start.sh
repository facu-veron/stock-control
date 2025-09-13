#!/bin/bash

# Stock Control - Desarrollo Local
echo "🚀 Iniciando Stock Control en modo desarrollo..."

# Función para manejar Ctrl+C
cleanup() {
    echo -e "\n🛑 Deteniendo servicios..."
    docker compose down
    exit 0
}
trap cleanup SIGINT

# Verificar que Docker esté ejecutándose
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no está ejecutándose. Por favor, inicia Docker Desktop."
    exit 1
fi

# Crear directorio para base de datos si no existe
mkdir -p ./data

# Iniciar servicios con docker-compose
echo "📦 Iniciando base de datos..."
docker compose up -d postgres

# Esperar a que PostgreSQL esté listo
echo "⏳ Esperando a que PostgreSQL esté listo..."
sleep 5

# Verificar conexión a la base de datos
until docker compose exec postgres pg_isready -U admin > /dev/null 2>&1; do
    echo "⏳ Esperando PostgreSQL..."
    sleep 2
done

echo "✅ PostgreSQL está listo!"

# Aplicar migraciones
echo "📊 Aplicando migraciones..."
cd backend && npm run db:push && cd ..

# Ejecutar seed (opcional)
read -p "¿Quieres ejecutar el seed de datos? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Ejecutando seed..."
    cd backend && npm run db:seed && cd ..
fi

echo "🎉 Base de datos configurada!"
echo ""
echo "📋 Para desarrollo manual:"
echo "  Backend: cd backend && npm run dev"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "🌐 URLs locales:"
echo "  Frontend: http://localhost:3000"
echo "  Backend: http://localhost:4000"
echo "  Health: http://localhost:4000/api/health"
echo ""
echo "Press Ctrl+C to stop all services"

# Mantener el script corriendo para capturar Ctrl+C
while true; do
    sleep 1
done