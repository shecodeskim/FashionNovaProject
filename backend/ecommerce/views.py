from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from .models import *
from .serializers import *
import json

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.filter(is_active=True)
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'brand', 'gender', 'seller']
    search_fields = ['name', 'description', 'category__name', 'brand__name']
    ordering_fields = ['price', 'created_at', 'average_rating']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter by price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        
        # Filter by discount
        has_discount = self.request.query_params.get('has_discount')
        if has_discount == 'true':
            queryset = queryset.filter(discount_price__isnull=False)
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        product = self.get_object()
        reviews = product.reviews.filter(is_approved=True)
        serializer = ProductReviewSerializer(reviews, many=True)
        return Response(serializer.data)

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer

class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.filter(is_active=True)
    serializer_class = BrandSerializer

class ProductReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ProductReviewSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ProductReview.objects.filter(customer=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)

class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Wishlist.objects.filter(customer=self.request.user)
    
    def create(self, request, *args, **kwargs):
        product_id = request.data.get('product')
        product = Product.objects.get(id=product_id)
        
        # Check if already in wishlist
        if Wishlist.objects.filter(customer=request.user, product=product).exists():
            return Response({'detail': 'Product already in wishlist'}, status=status.HTTP_400_BAD_REQUEST)
        
        wishlist_item = Wishlist.objects.create(customer=request.user, product=product)
        serializer = self.get_serializer(wishlist_item)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def move_to_cart(self, request):
        wishlist_item_id = request.data.get('wishlist_item_id')
        try:
            wishlist_item = Wishlist.objects.get(id=wishlist_item_id, customer=request.user)
            cart, created = Cart.objects.get_or_create(customer=request.user)
            
            # Add to cart
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                product=wishlist_item.product,
                defaults={'quantity': 1}
            )
            
            if not created:
                cart_item.quantity += 1
                cart_item.save()
            
            # Remove from wishlist
            wishlist_item.delete()
            
            return Response({'detail': 'Moved to cart successfully'})
        except Wishlist.DoesNotExist:
            return Response({'detail': 'Wishlist item not found'}, status=status.HTTP_404_NOT_FOUND)

class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Cart.objects.filter(customer=self.request.user)
    
    @action(detail=False, methods=['get'])
    def my_cart(self, request):
        cart, created = Cart.objects.get_or_create(customer=request.user)
        serializer = self.get_serializer(cart)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def add_item(self, request):
        product_id = request.data.get('product')
        quantity = request.data.get('quantity', 1)
        
        try:
            product = Product.objects.get(id=product_id)
            cart, created = Cart.objects.get_or_create(customer=request.user)
            
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                product=product,
                defaults={'quantity': quantity}
            )
            
            if not created:
                cart_item.quantity += int(quantity)
                cart_item.save()
            
            serializer = CartItemSerializer(cart_item)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Product.DoesNotExist:
            return Response({'detail': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def remove_item(self, request):
        item_id = request.data.get('item_id')
        try:
            cart_item = CartItem.objects.get(id=item_id, cart__customer=request.user)
            cart_item.delete()
            return Response({'detail': 'Item removed from cart'})
        except CartItem.DoesNotExist:
            return Response({'detail': 'Item not found in cart'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def update_quantity(self, request):
        item_id = request.data.get('item_id')
        quantity = request.data.get('quantity')
        
        if int(quantity) <= 0:
            return self.remove_item(request)
        
        try:
            cart_item = CartItem.objects.get(id=item_id, cart__customer=request.user)
            cart_item.quantity = quantity
            cart_item.save()
            serializer = CartItemSerializer(cart_item)
            return Response(serializer.data)
        except CartItem.DoesNotExist:
            return Response({'detail': 'Item not found in cart'}, status=status.HTTP_404_NOT_FOUND)

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user)
    
    def create(self, request, *args, **kwargs):
        # Get cart items
        cart = Cart.objects.filter(customer=request.user).first()
        if not cart or cart.items.count() == 0:
            return Response({'detail': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate totals
        subtotal = cart.total_price
        shipping_cost = 0  # Calculate based on location
        tax_amount = subtotal * 0.16  # 16% VAT
        discount_amount = 0  # Apply coupon if any
        
        total_amount = subtotal + shipping_cost + tax_amount - discount_amount
        
        # Create order
        order = Order.objects.create(
            customer=request.user,
            shipping_address=request.data.get('shipping_address', ''),
            billing_address=request.data.get('billing_address', request.data.get('shipping_address', '')),
            subtotal=subtotal,
            shipping_cost=shipping_cost,
            tax_amount=tax_amount,
            discount_amount=discount_amount,
            total_amount=total_amount,
            order_number=f"ORD{timezone.now().strftime('%Y%m%d%H%M%S')}"
        )
        
        # Create order items
        for cart_item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                seller=cart_item.product.seller,
                quantity=cart_item.quantity,
                price=cart_item.product.price,
                discount_price=cart_item.product.discount_price,
                total_price=cart_item.total_price
            )
        
        # Clear cart
        cart.items.all().delete()
        
        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status not in ['delivered', 'cancelled', 'refunded']:
            order.status = 'cancelled'
            order.save()
            return Response({'detail': 'Order cancelled successfully'})
        return Response({'detail': 'Cannot cancel order in current status'}, status=status.HTTP_400_BAD_REQUEST)

class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.filter(is_active=True)
    serializer_class = CouponSerializer
    
    @action(detail=False, methods=['post'])
    def validate(self, request):
        code = request.data.get('code')
        cart_total = float(request.data.get('cart_total', 0))
        
        try:
            coupon = Coupon.objects.get(code=code)
            if coupon.is_valid(cart_total=cart_total):
                # Calculate discount
                if coupon.discount_type == 'percentage':
                    discount = cart_total * (coupon.discount_value / 100)
                else:
                    discount = coupon.discount_value
                
                return Response({
                    'valid': True,
                    'discount': discount,
                    'coupon': CouponSerializer(coupon).data
                })
            else:
                return Response({'valid': False, 'detail': 'Coupon is not valid'})
        except Coupon.DoesNotExist:
            return Response({'valid': False, 'detail': 'Invalid coupon code'})

# Create your views here.
