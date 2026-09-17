import type {
  CategoryDto,
  PublicProductDto,
  PublicSellerDto,
  SellerCardDto,
} from '@tradekwik/shared';
import type { Category, Product, Seller } from '../db/schema.js';

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
    media: row.media,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    updatedAt: row.updatedAt.toISOString(),
  };
}
