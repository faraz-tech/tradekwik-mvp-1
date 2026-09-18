import type {
  CategoryDto,
  PublicProductDto,
  PublicSellerDto,
  SellerCardDto,
  SellerInquiryDto,
  SellerOrderRequestDto,
  SellerProductDto,
  SellerProfileDto,
} from '@tradekwik/shared';
import type { Category, Inquiry, OrderRequest, Product, Seller } from '../db/schema.js';

/** DB row → public DTO mappers. Anything not mapped here never leaves the API. */

export function toCategoryDto(row: Category): CategoryDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parentId,
  };
}

export function toPublicSellerDto(row: Seller): PublicSellerDto {
  return {
    id: row.id,
    slug: row.slug,
    businessName: row.businessName,
    categoryId: row.categoryId,
    description: row.description,
    city: row.city,
    state: row.state,
    address: row.address,
    phone: row.phone,
    whatsappNumber: row.whatsappNumber,
    email: row.email,
    logoUrl: row.logoUrl,
    coverImageUrl: row.coverImageUrl,
    isVerified: row.isVerified,
    status: row.status,
    servesPanIndia: row.servesPanIndia,
    deliveryRadiusKm: row.deliveryRadiusKm,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toSellerCardDto(row: Seller): SellerCardDto {
  return {
    slug: row.slug,
    businessName: row.businessName,
    city: row.city,
    state: row.state,
    isVerified: row.isVerified,
    whatsappNumber: row.whatsappNumber,
    phone: row.phone,
    logoUrl: row.logoUrl,
  };
}

export function toSellerProfileDto(row: Seller): SellerProfileDto {
  return { ...toPublicSellerDto(row), gstNumber: row.gstNumber };
}

export function toSellerProductDto(row: Product): SellerProductDto {
  return {
    ...toPublicProductDto(row),
    isPublished: row.isPublished,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toSellerInquiryDto(row: Inquiry, productName: string | null): SellerInquiryDto {
  return {
    id: row.id,
    productId: row.productId,
    productName,
    buyerName: row.buyerName,
    buyerPhone: row.buyerPhone,
    buyerCity: row.buyerCity,
    buyerType: row.buyerType,
    quantity: row.quantity,
    message: row.message,
    source: row.source,
    status: row.status,
    sellerNotes: row.sellerNotes,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toSellerOrderRequestDto(row: OrderRequest): SellerOrderRequestDto {
  return {
    id: row.id,
    buyerName: row.buyerName,
    buyerPhone: row.buyerPhone,
    deliveryAddress: row.deliveryAddress,
    orderType: row.orderType,
    eventDate: row.eventDate,
    items: row.items,
    status: row.status,
    sellerNotes: row.sellerNotes,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toPublicProductDto(row: Product): PublicProductDto {
  return {
    id: row.id,
    sellerId: row.sellerId,
    categoryId: row.categoryId,
    slug: row.slug,
    name: row.name,
    description: row.description,
    specs: row.specs,
    priceRetail: row.priceRetail,
    priceBulk: row.priceBulk,
    minBulkQty: row.minBulkQty,
    priceOnRequest: row.priceOnRequest,
    stockStatus: row.stockStatus,
    listingType: row.listingType,
    media: row.media,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    updatedAt: row.updatedAt.toISOString(),
  };
}
