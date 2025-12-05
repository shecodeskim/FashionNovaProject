from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import CustomerProfile, SellerProfile

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'user_type', 'phone_number', 'date_joined']
        read_only_fields = ['date_joined']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    user_type = serializers.ChoiceField(choices=User.USER_TYPE_CHOICES, default='customer')
    store_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 
                  'phone_number', 'password', 'password2', 'user_type', 'store_name']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        store_name = validated_data.pop('store_name', None)
        user_type = validated_data.pop('user_type', 'customer')
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone_number=validated_data.get('phone_number', ''),
            password=validated_data['password'],
            user_type=user_type
        )
        
        if user_type == 'seller' and store_name:
            SellerProfile.objects.create(user=user, store_name=store_name)
        elif user_type == 'customer':
            CustomerProfile.objects.create(user=user)
        
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    customer_profile = serializers.SerializerMethodField()
    seller_profile = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'user_type', 'phone_number', 'profile_picture',
                  'customer_profile', 'seller_profile', 'date_joined']
        read_only_fields = ['date_joined']
    
    def get_customer_profile(self, obj):
        if hasattr(obj, 'customer_profile'):
            return {
                'shipping_address': obj.customer_profile.shipping_address,
                'billing_address': obj.customer_profile.billing_address,
                'loyalty_points': obj.customer_profile.loyalty_points
            }
        return None
    
    def get_seller_profile(self, obj):
        if hasattr(obj, 'seller_profile'):
            return {
                'store_name': obj.seller_profile.store_name,
                'is_verified': obj.seller_profile.is_verified,
                'rating': obj.seller_profile.rating,
                'total_sales': obj.seller_profile.total_sales
            }
        return None