from django.urls import path
from . import views

urlpatterns = [
    path('platos/', views.obtener_platos, name='obtener_platos'),
    path('platos/<int:pk>/', views.plato_detail, name='plato_detail'),
    path('pedidos/', views.order_list, name='order_list'),
    path('pedidos/<int:order_id>/', views.get_order_details, name='get_order_details'),
    path('pedidos/<int:order_id>/status/', views.update_order_status, name='update_order_status'),
    
    # URLs de autenticación
    path('auth/login/', views.login_view, name='login'),
    path('auth/logout/', views.logout_view, name='logout'),
]