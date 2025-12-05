from datetime import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .mpesa import MpesaGateway
from ecommerce.models import Order
import json

class MpesaSTKPushView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        phone_number = request.data.get('phone_number')
        amount = request.data.get('amount')
        order_id = request.data.get('order_id')
        
        if not all([phone_number, amount, order_id]):
            return Response(
                {'error': 'Missing required parameters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            order = Order.objects.get(id=order_id, customer=request.user)
            mpesa = MpesaGateway()
            
            # Format phone number (remove leading 0 if present)
            if phone_number.startswith('0'):
                phone_number = '254' + phone_number[1:]
            elif phone_number.startswith('+254'):
                phone_number = phone_number[1:]
            elif phone_number.startswith('254'):
                phone_number = phone_number
            else:
                phone_number = '254' + phone_number
            
            response = mpesa.stk_push(
                phone_number=phone_number,
                amount=int(float(amount)),
                account_reference=f"ORDER{order.order_number}",
                transaction_desc="FashionNova Purchase"
            )
            
            if 'ResponseCode' in response and response['ResponseCode'] == '0':
                # Update order with checkout request ID
                order.mpesa_checkout_request_id = response.get('CheckoutRequestID')
                order.save()
                
                return Response({
                    'success': True,
                    'message': 'Payment initiated successfully',
                    'checkout_request_id': response.get('CheckoutRequestID'),
                    'customer_message': response.get('CustomerMessage')
                })
            else:
                return Response({
                    'success': False,
                    'error': response.get('errorMessage', 'Payment initiation failed')
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class MpesaCallbackView(APIView):
    def post(self, request):
        callback_data = request.data
        
        # Log the callback for debugging
        print("MPESA Callback received:", json.dumps(callback_data, indent=2))
        
        # Extract checkout request ID and result code
        checkout_request_id = callback_data.get('Body', {}).get('stkCallback', {}).get('CheckoutRequestID')
        result_code = callback_data.get('Body', {}).get('stkCallback', {}).get('ResultCode')
        
        if result_code == 0:
            # Payment successful
            # Find order and update status
            try:
                order = Order.objects.get(mpesa_checkout_request_id=checkout_request_id)
                order.is_paid = True
                order.paid_at = timezone.now()
                order.status = 'confirmed'
                order.save()
                
                # Send confirmation email/sms
                # TODO: Implement notification
                
            except Order.DoesNotExist:
                pass
        
        return Response({'ResultCode': 0, 'ResultDesc': 'Success'})

class PaymentStatusView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, checkout_request_id):
        mpesa = MpesaGateway()
        response = mpesa.query_transaction(checkout_request_id)
        
        return Response(response)

# Create your views here.
