from django.shortcuts import render
from django.views.generic import TemplateView

class HomeView(TemplateView):
    template_name = 'index.html'

class LoginView(TemplateView):
    template_name = 'auth.html'

class ProductsView(TemplateView):
    template_name = 'products.html'

class ProductDetailView(TemplateView):
    template_name = 'product_detail.html'

class CartView(TemplateView):
    template_name = 'cart.html'

class CheckoutView(TemplateView):
    template_name = 'checkout.html'

class SellerDashboardView(TemplateView):
    template_name = 'seller_dashboard.html'

class ProfileView(TemplateView):
    template_name = 'profile.html'

class OrdersView(TemplateView):
    template_name = 'orders.html'

class WishlistView(TemplateView):
    template_name = 'wishlist.html'

class CategoriesView(TemplateView):
    template_name = 'categories.html'    

class BrandsView(TemplateView):
    template_name = 'brands.html'

class AboutView(TemplateView):
    template_name = 'about.html'
