# Sistema de Inventario - Backend

Backend desarrollado en TypeScript con Express, Prisma y SQLite para el sistema de inventario.

## 🚀 Características

- **TypeScript**: Tipado estático para mayor seguridad y mejor desarrollo
- **Express.js**: Framework web rápido y minimalista
- **Prisma**: ORM moderno para TypeScript y Node.js
- **SQLite**: Base de datos ligera y fácil de usar
- **JWT**: Autenticación basada en tokens
- **Bcrypt**: Encriptación de contraseñas
- **Express Validator**: Validación de datos de entrada
- **CORS**: Configuración de políticas de origen cruzado
- **Helmet**: Middleware de seguridad

## 📋 Requisitos

- Node.js 18+ 
- npm o yarn

## 🛠️ Instalación

1. **Clonar el repositorio**
\`\`\`bash
git clone <url-del-repositorio>
cd backend
\`\`\`

2. **Instalar dependencias**
\`\`\`bash
npm install
\`\`\`

3. **Configurar variables de entorno**
\`\`\`bash
cp .env.example .env
\`\`\`

Editar el archivo `.env` con tus configuraciones:
\`\`\`env
DATABASE_URL="file:./dev.db"
JWT_SECRET="tu-jwt-secret-muy-seguro"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
\`\`\`

4. **Configurar la base de datos**
\`\`\`bash
# Generar el cliente de Prisma
npm run db:generate

# Crear y aplicar migraciones
npm run db:push

# Poblar la base de datos con datos de ejemplo
npm run db:seed
\`\`\`

## 🏃‍♂️ Uso

### Desarrollo
\`\`\`bash
npm run dev
\`\`\`

### Producción
\`\`\`bash
# Compilar TypeScript
npm run build

# Iniciar servidor
npm start
\`\`\`

### Otros comandos útiles
\`\`\`bash
# Verificar tipos sin compilar
npm run type-check

# Abrir Prisma Studio (interfaz visual para la DB)
npm run db:studio

# Regenerar cliente de Prisma
npm run db:generate
\`\`\`

## 📚 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual
- `POST /api/auth/logout` - Cerrar sesión

### Categorías
- `GET /api/categories` - Listar categorías
- `GET /api/categories/:id` - Obtener categoría por ID
- `POST /api/categories` - Crear categoría (Admin)
- `PUT /api/categories/:id` - Actualizar categoría (Admin)
- `DELETE /api/categories/:id` - Eliminar categoría (Admin)

### Productos
- `GET /api/products` - Listar productos
- `GET /api/products/:id` - Obtener producto por ID
- `POST /api/products` - Crear producto (Admin)
- `PUT /api/products/:id` - Actualizar producto (Admin)
- `PATCH /api/products/:id/stock` - Actualizar stock
- `DELETE /api/products/:id` - Eliminar producto (Admin)
- `GET /api/products/reports/low-stock` - Productos con stock bajo

### Salud del sistema
- `GET /api/health` - Estado del servidor

## 🔐 Autenticación

El sistema utiliza JWT (JSON Web Tokens) para la autenticación. Los tokens deben enviarse en el header `Authorization`:

\`\`\`
Authorization: Bearer <token>
\`\`\`

## 👥 Roles de Usuario

- **ADMIN**: Acceso completo al sistema
- **EMPLOYEE**: Acceso limitado (solo lectura en la mayoría de endpoints)

## 📊 Base de Datos

### Modelos principales:

- **User**: Usuarios del sistema
- **Category**: Categorías de productos
- **Product**: Productos del inventario

### Relaciones:
- Un producto pertenece a una categoría
- Una categoría puede tener múltiples productos

## 🛡️ Seguridad

- Contraseñas hasheadas con bcrypt
- Validación de datos de entrada
- Middleware de seguridad con Helmet
- CORS configurado
- Rate limiting (opcional)

## 🧪 Datos de Prueba

Después de ejecutar `npm run db:seed`, tendrás acceso a:

**Usuario Administrador:**
- Email: `admin@inventario.com`
- Contraseña: `admin123`

**Usuario Empleado:**
- Email: `empleado@inventario.com`
- Contraseña: `empleado123`

## 📁 Estructura del Proyecto

\`\`\`
backend/
├── src/
│   ├── middleware/     # Middleware personalizado
│   ├── routes/         # Rutas de la API
│   ├── types/          # Tipos de TypeScript
│   ├── server.ts       # Servidor principal
│   └── seed.ts         # Script de población de datos
├── prisma/
│   └── schema.prisma   # Esquema de la base de datos
├── dist/               # Código compilado
├── package.json
├── tsconfig.json       # Configuración de TypeScript
└── README.md
\`\`\`

## 🐛 Debugging

Para debugging, puedes usar:

\`\`\`bash
# Logs detallados
DEBUG=* npm run dev

# Ver la base de datos
npm run db:studio
\`\`\`

## 📝 Notas de Desarrollo

- El servidor se reinicia automáticamente en desarrollo con `ts-node-dev`
- Los tipos se generan automáticamente desde el esquema de Prisma
- Todas las rutas están protegidas por autenticación excepto login y register
- Los errores se manejan centralizadamente con middleware personalizado

## 🚀 Despliegue

Para producción, asegúrate de:

1. Configurar variables de entorno de producción
2. Usar una base de datos más robusta (PostgreSQL, MySQL)
3. Configurar HTTPS
4. Implementar rate limiting
5. Configurar logs apropiados
6. Usar un proceso manager como PM2

## 📞 Soporte

Si encuentras algún problema, revisa:

1. Los logs del servidor
2. La configuración de variables de entorno
3. La conexión a la base de datos
4. Los permisos de usuario

Para más ayuda, consulta la documentación de:
- [Express.js](https://expressjs.com/)
- [Prisma](https://www.prisma.io/docs/)
- [TypeScript](https://www.typescriptlang.org/docs/)
\`\`\`

Ahora el backend está completamente en TypeScript con:

✅ **Tipado completo** - Todos los archivos tienen tipos explícitos
✅ **Configuración de TypeScript** - tsconfig.json optimizado
✅ **Scripts actualizados** - Para desarrollo y producción
✅ **Interfaces y tipos** - Definidos en archivo separado
✅ **Validación mejorada** - Con tipos en tiempo de compilación
✅ **Mejor desarrollo** - Con ts-node-dev para hot reload
✅ **Documentación completa** - README actualizado

Para usar el backend:

1. `cd backend`
2. `npm install`
3. `npm run db:generate`
4. `npm run db:push`
5. `npm run db:seed`
6. `npm run dev`
