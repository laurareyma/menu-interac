from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Plato, Pedido, DetallePedido
from .serializers import PlatoSerializer, PedidoSerializer, DetallePedidoSerializer
from decimal import Decimal, InvalidOperation
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json


# Create your views here.

class PlatoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para manejar las operaciones CRUD de los platos.
    """
    queryset = Plato.objects.all()
    serializer_class = PlatoSerializer

@api_view(['GET'])
def obtener_platos(request):
    try:
        platos = Plato.objects.all().values('nombre', 'categoria', 'descripcion', 'precio', 'imagen')
        return Response({"platos": list(platos)})
    except InvalidOperation as e:
        return Response({"error": "Valor decimal no válido", "detalle": str(e)}, status=500)
    except Exception as e:
        return Response({"error": "Error inesperado", "detalle": str(e)}, status=500)

@api_view(['GET'])
def plato_list(request):
    """
    List all platos (menu items)
    """
    platos = Plato.objects.all()
    serializer = PlatoSerializer(platos, many=True)
    return Response(serializer.data)

@api_view(['GET', 'POST'])
def order_list(request):
    """
    List all orders or create a new order
    """
    if request.method == 'GET':
        pedidos = Pedido.objects.all()
        serializer = PedidoSerializer(pedidos, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        try:
            data = request.data
            print(f"Received order data: {data}")  # Debug log
            
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
                total=total
            )
            
            # Crear los detalles del pedido
            for detalle in detalles:
                DetallePedido.objects.create(
                    pedido=pedido,
                    plato=detalle['plato'],
                    cantidad=detalle['cantidad'],
                    subtotal=detalle['subtotal']
                )
            
            serializer = PedidoSerializer(pedido)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"Error processing order: {str(e)}")  # Debug log
            return Response(
                {'error': f'Error al procesar el pedido: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

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