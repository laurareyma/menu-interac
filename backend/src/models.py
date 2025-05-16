from django.db import models

class Plato(models.Model):
    nombre = models.CharField(max_length=100)
    categoria = models.CharField(max_length=50, blank=True, null=True)
    descripcion = models.TextField()
    precio = models.DecimalField(max_digits=8, decimal_places=2)
    imagen = models.ImageField(upload_to='Assets/')

    def __str__(self):
        return self.nombre

class Pedido(models.Model):
    fecha = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=20, default='pendiente')
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