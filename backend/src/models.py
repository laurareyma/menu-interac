from django.db import models

class Plato(models.Model):
    nombre = models.CharField(max_length=100)
    categoria = models.CharField(max_length=50, default='sin_categoria')
    descripcion = models.TextField()
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    imagen = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return self.nombre

    class Meta:
        db_table = 'src_plato'

class Pedido(models.Model):
    fecha = models.DateTimeField(auto_now_add=True)
    cliente = models.CharField(max_length=100, blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.CharField(max_length=200, blank=True, null=True)
    estado = models.CharField(max_length=20, choices=[
        ('pendiente', 'Pendiente'),
        ('atendido', 'Atendido')
    ], default='pendiente')
    total = models.DecimalField(max_digits=10, decimal_places=2)
    platos = models.ManyToManyField(Plato, through='DetallePedido')

    def __str__(self):
        return f"Pedido #{self.id} - {self.fecha}"

class DetallePedido(models.Model):
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE)
    plato = models.ForeignKey(Plato, on_delete=models.CASCADE)
    cantidad = models.IntegerField(default=1)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.cantidad}x {self.plato.nombre}"