-- Script para crear shadow database
-- Archivo: postgres-init/01-create-shadow-db.sql

-- Conectar a la base principal y crear shadow database
CREATE DATABASE stockcontrol_prod_shadow;

-- Otorgar permisos al usuario
GRANT ALL PRIVILEGES ON DATABASE stockcontrol_prod_shadow TO stockcontrol_user;

-- Conectar a shadow database
\c stockcontrol_prod_shadow;

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Volver a la base principal
\c stockcontrol_prod_db;

-- Crear las mismas extensiones en la base principal
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";