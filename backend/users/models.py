from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('customer', 'Customer'),
        ('seller', 'Seller'),
        ('admin', 'Admin'),
    )
    
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='customer')
    phone_number = models.CharField(max_length=15, unique=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    is_email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.username} ({self.get_user_type_display()})"

class SellerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='seller_profile')
    store_name = models.CharField(max_length=100)
    business_registration = models.CharField(max_length=50, blank=True, null=True)
    tax_id = models.CharField(max_length=50, blank=True, null=True)
    bank_account = models.CharField(max_length=50, blank=True, null=True)
    rating = models.FloatField(default=0.0)
    total_sales = models.IntegerField(default=0)
    is_verified = models.BooleanField(default=False)
    
    def __str__(self):
        return self.store_name

class CustomerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    shipping_address = models.TextField(blank=True, null=True)
    billing_address = models.TextField(blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    loyalty_points = models.IntegerField(default=0)
    
    def __str__(self):
        return f"Customer: {self.user.username}"