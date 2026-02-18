from django.contrib import admin
from .models import Category, Listing, ListingImage, Review


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}


class ListingImageInline(admin.TabularInline):
    model = ListingImage
    extra = 1


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ['title', 'host', 'category', 'daily_price', 'verification_status', 'is_available', 'promoted_flag', 'rating']
    list_filter = ['verification_status', 'is_available', 'promoted_flag', 'category']
    search_fields = ['title', 'description', 'host__username', 'location']
    readonly_fields = ['created_at', 'updated_at', 'rating', 'total_reviews', 'total_bookings']
    inlines = [ListingImageInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('host', 'title', 'description', 'category')
        }),
        ('Pricing', {
            'fields': ('daily_price', 'deposit')
        }),
        ('Location', {
            'fields': ('location', 'address', 'latitude', 'longitude')
        }),
        ('Availability', {
            'fields': ('availability_start', 'availability_end', 'is_available')
        }),
        ('Verification', {
            'fields': ('verification_status', 'verification_remarks', 'verified_at', 'verified_by')
        }),
        ('Stats', {
            'fields': ('rating', 'total_reviews', 'total_bookings')
        }),
        ('Premium', {
            'fields': ('promoted_flag', 'promoted_until')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['listing', 'reviewer', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['listing__title', 'reviewer__username', 'comment']
    readonly_fields = ['created_at', 'updated_at']
