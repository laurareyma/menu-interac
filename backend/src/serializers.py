from rest_framework import serializers
from .models import Plato, Pedido, DetallePedido

class PlatoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plato
        fields = ['id', 'nombre', 'categoria', 'descripcion', 'precio', 'imagen']

    def to_representation(self, instance):
        try:
            data = super().to_representation(instance)
            # Manejar la URL de la imagen
            if data.get('imagen'):
                # Si la imagen comienza con 'static/', remover ese prefijo
                if data['imagen'].startswith('/static/'):
                    data['imagen'] = data['imagen'][8:]
                # Si la imagen comienza con 'Assets/', mantenerla como está
                elif not data['imagen'].startswith('Assets/'):
                    data['imagen'] = f"Assets/{data['imagen'].split('/')[-1]}"
            return data
        except Exception as e:
            print(f"Error en to_representation: {str(e)}")
            # Si hay un error, devolver los datos sin procesar
            return {
                'id': instance.id,
                'nombre': instance.nombre,
                'categoria': instance.categoria,
                'descripcion': instance.descripcion,
                'precio': str(instance.precio),
                'imagen': str(instance.imagen) if instance.imagen else None
            }

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


        