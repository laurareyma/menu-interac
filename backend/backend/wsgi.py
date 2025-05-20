"""
WSGI config for backend project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os
from django.core.wsgi import get_wsgi_application
from django.core.management import call_command
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Crear aplicación WSGI
application = get_wsgi_application()

# Inicializar Django
django.setup()

# Importar modelos después de que Django esté configurado
from django.contrib.auth.models import User

# Crear superusuario si no existe
def create_superuser():
    if not User.objects.filter(is_superuser=True).exists():
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'admin123')
        
        try:
            User.objects.create_superuser(username=username, email=email, password=password)
            print(f"Superusuario {username} creado exitosamente")
        except Exception as e:
            print(f"Error al crear superusuario: {str(e)}")

# Cargar datos iniciales
def load_initial_data():
    try:
        call_command('loaddata', 'src/fixtures/platos_iniciales.json')
        print("Datos iniciales cargados exitosamente")
    except Exception as e:
        print(f"Error al cargar datos iniciales: {str(e)}")

# Ejecutar tareas de inicialización
try:
    create_superuser()
    load_initial_data()
except Exception as e:
    print(f"Error en la inicialización: {str(e)}")
