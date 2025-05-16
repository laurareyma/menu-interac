#!/usr/bin/env bash
# exit on error
set -o errexit

# Instalar dependencias
pip install -r backend/requirements.txt

# Cambiar al directorio backend
cd backend

# Ejecutar migraciones
python manage.py migrate

# Recolectar archivos estáticos
python manage.py collectstatic --no-input 