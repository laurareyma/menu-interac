from rest_framework import serializers
from .models import Plato, Pedido, DetallePedido

class PlatoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plato
        fields = ['id', 'nombre', 'categoria', 'descripcion', 'precio', 'imagen']
        read_only_fields = ['id']

class DetallePedidoSerializer(serializers.ModelSerializer):
    plato = PlatoSerializer(read_only=True)
    
    class Meta:
        model = DetallePedido
        fields = ['id', 'plato', 'cantidad', 'subtotal']
        read_only_fields = ['id', 'subtotal']

class PedidoSerializer(serializers.ModelSerializer):
    detalles = DetallePedidoSerializer(source='detallepedido_set', many=True, read_only=True)
    
    class Meta:
        model = Pedido
        fields = ['id', 'fecha', 'estado', 'total', 'detalles']
        read_only_fields = ['id', 'fecha', 'total']


        