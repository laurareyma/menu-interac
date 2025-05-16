from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db.utils import IntegrityError
import os

class Command(BaseCommand):
    help = 'Creates a superuser if none exists'

    def handle(self, *args, **options):
        self.stdout.write('Checking for existing superuser...')
        
        if not User.objects.filter(is_superuser=True).exists():
            self.stdout.write('No superuser found. Creating new superuser...')
            try:
                username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
                email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
                password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'admin123')
                
                self.stdout.write(f'Creating superuser with username: {username}')
                User.objects.create_superuser(
                    username=username,
                    email=email,
                    password=password
                )
                self.stdout.write(self.style.SUCCESS('Superuser created successfully'))
            except IntegrityError as e:
                self.stdout.write(self.style.ERROR(f'Error creating superuser: {str(e)}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Unexpected error: {str(e)}'))
        else:
            self.stdout.write(self.style.SUCCESS('Superuser already exists')) 