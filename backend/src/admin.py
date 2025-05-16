from django.contrib import admin
from .models import Plato, Pedido, DetallePedido

class DetallePedidoInline(admin.TabularInline):
    model = DetallePedido
    extra = 0
    readonly_fields = ['subtotal']

@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ['id', 'fecha', 'estado', 'total']
    list_filter = ['estado', 'fecha']
    search_fields = ['id']
    readonly_fields = ['fecha', 'total']
    inlines = [DetallePedidoInline]

@admin.register(Plato)
class PlatoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'categoria', 'precio']
    list_filter = ['categoria']
    search_fields = ['nombre', 'descripcion']
