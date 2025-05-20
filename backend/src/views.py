from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from .models import Plato, Pedido, DetallePedido
from .serializers import PlatoSerializer, PedidoSerializer, DetallePedidoSerializer
from decimal import Decimal, InvalidOperation
import json
import traceback
from django.db import connection
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token


# Create your views here.

class PlatoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para manejar las operaciones CRUD de los platos.
    """
    queryset = Plato.objects.all()
    serializer_class = PlatoSerializer

@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])
def obtener_platos(request):
    print("\n=== INICIO DE LA PETICIÓN ===")
    print(f"URL: {request.build_absolute_uri()}")
    print(f"Método: {request.method}")
    print(f"Headers: {dict(request.headers)}")
    
    try:
        # Verificar que la tabla existe
        with connection.cursor() as cursor:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='src_plato';")
            table_exists = cursor.fetchone() is not None
            print(f"Tabla src_plato existe: {table_exists}")
        
        # Obtener los platos de la manera más simple posible
        platos = Plato.objects.all()
        print(f"Query SQL: {platos.query}")
        print(f"Número de platos encontrados: {platos.count()}")
        
        # Convertir a lista de diccionarios
        platos_list = []
        for plato in platos:
            try:
                plato_dict = {
                    'id': plato.id,
                    'nombre': plato.nombre,
                    'categoria': plato.categoria,
                    'descripcion': plato.descripcion,
                    'precio': str(plato.precio),
                    'imagen': str(plato.imagen) if plato.imagen else None
                }
                platos_list.append(plato_dict)
                print(f"Plato procesado: {plato_dict}")
            except Exception as e:
                print(f"Error procesando plato {plato.id}: {str(e)}")
                print(f"Traceback: {traceback.format_exc()}")
        
        print(f"Lista final de platos: {platos_list}")
        
        # Verificar que la lista no esté vacía
        if not platos_list:
            print("ADVERTENCIA: La lista de platos está vacía")
            return JsonResponse({'data': []}, status=200)
        
        return JsonResponse({'data': platos_list}, status=200)
        
    except Exception as e:
        print(f"Error en obtener_platos: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['GET'])
def plato_list(request):
    """
    List all platos (menu items)
    """
    platos = Plato.objects.all()
    serializer = PlatoSerializer(platos, many=True)
    return Response(serializer.data)

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def order_list(request):
    """
    List all orders or create a new order
    """
    print("\n=== INICIO DE PETICIÓN DE ORDENES ===")
    print(f"URL: {request.build_absolute_uri()}")
    print(f"Método: {request.method}")
    print(f"Headers: {dict(request.headers)}")
    
    try:
        if request.method == 'GET':
            # Solo permitir GET si el usuario está autenticado
            if not request.user.is_authenticated:
                return Response(
                    {'error': 'Se requiere autenticación para ver los pedidos'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            pedidos = Pedido.objects.all()
            status_filter = request.GET.get('status', 'all')
            if status_filter != 'all':
                pedidos = pedidos.filter(estado=status_filter)
            # Agregar filtros por parámetros GET
            client_filter = request.GET.get('client', '')
            phone_filter = request.GET.get('phone', '')
            address_filter = request.GET.get('address', '')
            if client_filter:
                pedidos = pedidos.filter(cliente__icontains=client_filter)
            if phone_filter:
                pedidos = pedidos.filter(telefono__icontains=phone_filter)
            if address_filter:
                pedidos = pedidos.filter(direccion__icontains=address_filter)
            
            print(f"Query SQL: {pedidos.query}")
            print(f"Número de pedidos encontrados: {pedidos.count()}")
            
            # Convertir a lista de diccionarios
            pedidos_list = []
            for pedido in pedidos:
                try:
                    detalles = DetallePedido.objects.filter(pedido=pedido)
                    detalles_list = []
                    for detalle in detalles:
                        detalles_list.append({
                            'plato_id': detalle.plato.id,
                            'plato_nombre': detalle.plato.nombre,
                            'cantidad': detalle.cantidad,
                            'subtotal': str(detalle.subtotal)
                        })
                    
                    pedido_dict = {
                        'id': pedido.id,
                        'fecha': pedido.fecha.isoformat(),
                        'cliente': pedido.cliente or 'Cliente no especificado',
                        'telefono': pedido.telefono or 'No especificado',
                        'direccion': pedido.direccion or 'No especificada',
                        'estado': pedido.estado,
                        'total': str(pedido.total),
                        'detalles': detalles_list
                    }
                    pedidos_list.append(pedido_dict)
                    print(f"Pedido procesado: {pedido_dict}")
                except Exception as e:
                    print(f"Error procesando pedido {pedido.id}: {str(e)}")
                    print(f"Traceback: {traceback.format_exc()}")
            
            print(f"Lista final de pedidos: {pedidos_list}")
            return Response({'data': pedidos_list})
        
        elif request.method == 'POST':
            try:
                data = request.data
                print(f"Datos recibidos: {data}")
                
                if not data.get('platos'):
                    return Response(
                        {'error': 'No se proporcionaron platos para el pedido'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Calcular el total del pedido
                total = Decimal('0.00')
                detalles = []
                
                # Validar y procesar los platos del pedido
                for item in data.get('platos', []):
                    plato_id = item.get('plato_id')
                    cantidad = item.get('cantidad', 1)
                    
                    if not plato_id:
                        return Response(
                            {'error': 'ID de plato no proporcionado'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    try:
                        plato = Plato.objects.get(id=plato_id)
                        subtotal = plato.precio * Decimal(str(cantidad))
                        total += subtotal
                        
                        detalles.append({
                            'plato': plato,
                            'cantidad': cantidad,
                            'subtotal': subtotal
                        })
                    except Plato.DoesNotExist:
                        return Response(
                            {'error': f'Plato con ID {plato_id} no encontrado'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    except (ValueError, InvalidOperation) as e:
                        return Response(
                            {'error': f'Error en el cálculo del subtotal: {str(e)}'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                
                # Crear el pedido
                pedido = Pedido.objects.create(
                    estado='pendiente',
                    total=total,
                    cliente=data.get('cliente', 'Cliente no especificado'),
                    telefono=data.get('telefono', ''),
                    direccion=data.get('direccion', '')
                )
                
                # Crear los detalles del pedido
                for detalle in detalles:
                    DetallePedido.objects.create(
                        pedido=pedido,
                        plato=detalle['plato'],
                        cantidad=detalle['cantidad'],
                        subtotal=detalle['subtotal']
                    )
                
                # Preparar la respuesta
                detalles_list = []
                for detalle in detalles:
                    detalles_list.append({
                        'plato_id': detalle['plato'].id,
                        'plato_nombre': detalle['plato'].nombre,
                        'cantidad': detalle['cantidad'],
                        'subtotal': str(detalle['subtotal'])
                    })
                
                response_data = {
                    'id': pedido.id,
                    'fecha': pedido.fecha.isoformat(),
                    'estado': pedido.estado,
                    'total': str(pedido.total),
                    'detalles': detalles_list
                }
                
                print(f"Pedido creado exitosamente: {response_data}")
                return Response(response_data, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                print(f"Error procesando pedido: {str(e)}")
                print(f"Traceback: {traceback.format_exc()}")
                return Response(
                    {'error': f'Error al procesar el pedido: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
    except Exception as e:
        print(f"\n=== ERROR ENCONTRADO ===")
        print(f"Tipo de error: {type(e)}")
        print(f"Mensaje de error: {str(e)}")
        print(f"Traceback completo:\n{traceback.format_exc()}")
        return Response(
            {
                "error": "Error inesperado",
                "tipo": str(type(e)),
                "mensaje": str(e),
                "detalle": traceback.format_exc()
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    finally:
        print("=== FIN DE LA PETICIÓN DE ORDENES ===\n")

@api_view(['GET'])
def plato_detail(request, pk):
    """
    Retrieve a single plato by ID
    """
    try:
        plato = Plato.objects.get(pk=pk)
    except Plato.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
    serializer = PlatoSerializer(plato)
    return Response(serializer.data)

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return Response({
                'error': 'Se requieren nombre de usuario y contraseña'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = authenticate(username=username, password=password)
        
        if user is not None:
            if user.is_active:
                # Generar token
                token, _ = Token.objects.get_or_create(user=user)
                
                return Response({
                    'user': {
                        'username': user.username,
                        'token': token.key,
                        'is_staff': user.is_staff
                    }
                })
            else:
                return Response({
                    'error': 'Usuario inactivo'
                }, status=status.HTTP_401_UNAUTHORIZED)
        else:
            return Response({
                'error': 'Credenciales inválidas'
            }, status=status.HTTP_401_UNAUTHORIZED)
            
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Vista para manejar el cierre de sesión
    """
    try:
        # Obtener el token del header de autorización
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return Response(
                {'error': 'Token de autenticación no proporcionado'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Cerrar la sesión
        logout(request)
        
        return Response({'message': 'Logout exitoso'})
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_orders(request):
    """
    Vista para obtener la lista de pedidos con filtros
    """
    try:
        # Obtener parámetros de filtrado
        status_filter = request.GET.get('status', 'all')
        client_filter = request.GET.get('client', '')
        phone_filter = request.GET.get('phone', '')
        address_filter = request.GET.get('address', '')
        
        # Consulta base
        pedidos = Pedido.objects.all()
        
        # Aplicar filtros
        if status_filter != 'all':
            pedidos = pedidos.filter(estado=status_filter)
        
        if client_filter:
            pedidos = pedidos.filter(cliente__icontains=client_filter)
        
        if phone_filter:
            pedidos = pedidos.filter(telefono__icontains=phone_filter)
            
        if address_filter:
            pedidos = pedidos.filter(direccion__icontains=address_filter)
        
        # Ordenar por fecha descendente
        pedidos = pedidos.order_by('-fecha')
        
        # Serializar los pedidos
        pedidos_list = []
        for pedido in pedidos:
            detalles = DetallePedido.objects.filter(pedido=pedido)
            detalles_list = []
            for detalle in detalles:
                detalles_list.append({
                    'plato_id': detalle.plato.id,
                    'plato_nombre': detalle.plato.nombre,
                    'cantidad': detalle.cantidad,
                    'subtotal': str(detalle.subtotal)
                })
            
            pedido_dict = {
                'id': pedido.id,
                'fecha': pedido.fecha.isoformat(),
                'cliente': pedido.cliente or 'Cliente no especificado',
                'telefono': pedido.telefono or 'No especificado',
                'direccion': pedido.direccion or 'No especificada',
                'estado': pedido.estado,
                'total': str(pedido.total),
                'detalles': detalles_list
            }
            pedidos_list.append(pedido_dict)
        
        return Response({'data': pedidos_list})
        
    except Exception as e:
        return Response(
            {
                "error": "Error inesperado",
                "mensaje": str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@csrf_exempt
@api_view(['PUT'])
@permission_classes([AllowAny])
def update_order_status(request, order_id):
    """
    Vista para actualizar el estado de un pedido
    """
    try:
        pedido = Pedido.objects.get(id=order_id)
        data = json.loads(request.body)
        new_status = data.get('estado')
        
        if new_status not in ['pendiente', 'atendido']:
            return Response(
                {'error': 'Estado inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        pedido.estado = new_status
        pedido.save()
        
        return Response({
            'message': 'Estado actualizado exitosamente',
            'pedido': {
                'id': pedido.id,
                'estado': pedido.estado
            }
        })
        
    except Pedido.DoesNotExist:
        return Response(
            {'error': 'Pedido no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_order_details(request, order_id):
    try:
        pedido = Pedido.objects.get(id=order_id)
        detalles = DetallePedido.objects.filter(pedido=pedido)
        
        detalles_data = [{
            'plato': {
                'id': detalle.plato.id,
                'nombre': detalle.plato.nombre,
                'precio': float(detalle.plato.precio)
            },
            'cantidad': detalle.cantidad,
            'subtotal': float(detalle.subtotal)
        } for detalle in detalles]
        
        return Response({
            'id': pedido.id,
            'fecha': pedido.fecha,
            'cliente': {
                'nombre': pedido.cliente or 'Cliente no especificado',
                'telefono': pedido.telefono or 'No especificado',
                'direccion': pedido.direccion or 'No especificada'
            },
            'estado': pedido.estado,
            'total': float(pedido.total),
            'detalles': detalles_data
        })
    except Pedido.DoesNotExist:
        return Response({'error': 'Pedido no encontrado'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    Vista para registrar nuevos usuarios
    """
    try:
        data = json.loads(request.body)
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not username or not email or not password:
            return Response({
                'error': 'Se requieren nombre de usuario, email y contraseña'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar si el usuario ya existe
        if User.objects.filter(username=username).exists():
            return Response({
                'error': 'El nombre de usuario ya está en uso'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(email=email).exists():
            return Response({
                'error': 'El email ya está en uso'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Crear el usuario con is_staff=True
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_staff=True  # Hacer al usuario staff por defecto
        )
        
        # Generar token
        token = Token.objects.create(user=user)
        
        return Response({
            'user': {
                'username': user.username,
                'email': user.email,
                'token': token.key,
                'is_staff': user.is_staff
            }
        }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([AllowAny])
def update_user_permissions(request):
    """
    Vista para actualizar los permisos de un usuario
    """
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return Response({
                'error': 'Se requieren nombre de usuario y contraseña'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Autenticar al usuario
        user = authenticate(username=username, password=password)
        
        if user is None:
            return Response({
                'error': 'Credenciales inválidas'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Actualizar permisos
        user.is_staff = True
        user.save()
        
        # Generar nuevo token
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response({
            'user': {
                'username': user.username,
                'email': user.email,
                'token': token.key,
                'is_staff': user.is_staff
            }
        })
            
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)