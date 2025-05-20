from django.contrib.sessions.backends.db import SessionStore
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
import logging

logger = logging.getLogger(__name__)

class TokenAuthenticationMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Excluir rutas que no requieren autenticación
        if (
            request.path.startswith('/api/platos/') or  # Excluir ruta de platos
            (request.method == 'PUT' and
            request.path.startswith('/api/pedidos/') and
            request.path.endswith('/status/'))
        ):
            return self.get_response(request)
        # Verificar si la ruta requiere autenticación
        if request.path.startswith('/api/orders/') or request.path.startswith('/api/pedidos/'):
            logger.info(f"\n=== INICIO DE MIDDLEWARE DE AUTENTICACIÓN ===")
            logger.info(f"URL: {request.path}")
            logger.info(f"Headers: {dict(request.headers)}")
            
            # Obtener el token del header de autorización
            auth_header = request.headers.get('Authorization', '')
            logger.info(f"Header de autorización: {auth_header}")
            
            if auth_header.startswith('Bearer '):
                token_key = auth_header.split(' ')[1]
                logger.info(f"Token extraído: {token_key}")
                
                try:
                    # Verificar el token usando el modelo Token
                    token = Token.objects.select_related('user').get(key=token_key)
                    request.user = token.user
                    logger.info(f"Usuario autenticado: {request.user}")
                    return self.get_response(request)
                except Token.DoesNotExist:
                    logger.warning("Token no encontrado en la base de datos")
                except Exception as e:
                    logger.error(f"Error al verificar token: {str(e)}")
            
            # Si no hay token válido, establecer usuario anónimo
            logger.info("Estableciendo usuario anónimo")
            request.user = AnonymousUser()
        
        response = self.get_response(request)
        logger.info("=== FIN DE MIDDLEWARE DE AUTENTICACIÓN ===\n")
        return response 