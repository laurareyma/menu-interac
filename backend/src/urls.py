from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'platos', views.PlatoViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/platos/', views.obtener_platos, name='obtener_platos'),
    path('platos/orders/', views.order_list, name='order_list'),
    path('platos/', views.plato_list, name='plato_list'),
    path('platos/<int:pk>/', views.plato_detail, name='plato_detail'),
    path('orders/', views.order_list, name='order_list'),
]