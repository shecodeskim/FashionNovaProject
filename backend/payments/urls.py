from django.urls import path
from .views import *

urlpatterns = [
    path('stk-push/', MpesaSTKPushView.as_view(), name='stk_push'),
    path('callback/', MpesaCallbackView.as_view(), name='mpesa_callback'),
    path('status/<str:checkout_request_id>/', PaymentStatusView.as_view(), name='payment_status'),
]