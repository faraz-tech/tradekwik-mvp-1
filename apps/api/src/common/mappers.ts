import type {
  BuyerProfileDto,
  DocumentDto,
  PublicDocumentDto,
  CategoryDto,
  OrderEventDto,
  PublicProductDto,
  PublicSellerDto,
  SellerCardDto,
  SellerCompanyProfileDto,
  SellerCompanyProfileOwnDto,
  SellerInquiryDto,
  SellerOrderRequestDto,
  SellerOwnerDto,
  SellerProductDto,
  SellerProfileDto,
  SellerTeamMemberDto,
  ShipmentDto,
} from '@tradekwik/shared';
import type {
  Buyer,
  BuyerDocument,
  Category,
  SellerDocument,
  Inquiry,
  OrderEvent,
  OrderRequest,
  Product,
  Seller,
  SellerOwner,
  SellerProfile,
  SellerUser,
  Shipment,
} from '../db/schema.js';

/** DB row → public DTO mappers. Anything not mapped here never leaves the API. */

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

export function toCategoryDto(row: Category): CategoryDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parentId,
    sortOrder: row.sortOrder,
  };
}

export function toPublicSellerDto(row: Seller): PublicSellerDto {
  return {
    id: row.id,
    slug: row.slug,
    businessName: row.businessName,
    categoryId: row.categoryId,
    sellerKind: row.sellerKind,
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
    foundedYear: row.foundedYear,
    teamSizeRange: row.teamSizeRange,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toSellerCardDto(row: Seller): SellerCardDto {
  return {
    slug: row.slug,
    businessName: row.businessName,
    sellerKind: row.sellerKind,
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

/** GSTIN 24ABCDE1234F1Z5 → 24ABCDE****F1Z5 (hides the PAN digits). */
export function maskGstin(gstin: string | null): string | null {
  if (!gstin || gstin.length < 10) return gstin ? '****' : null;
  return `${gstin.slice(0, 7)}****${gstin.slice(11)}`;
}

const EMPTY_PROFILE: Omit<SellerCompanyProfileOwnDto, never> = {
  legalName: null,
  registrationType: null,
  registrationYear: null,
  udyamNumber: null,
  capacityNote: null,
  leadTimeNote: null,
  paymentTerms: null,
  returnPolicy: null,
  processSteps: [],
  socialLinks: [],
  videos: [],
  premisesPhotos: [],
};

export function toCompanyProfileOwnDto(row: SellerProfile | undefined): SellerCompanyProfileOwnDto {
  if (!row) return { ...EMPTY_PROFILE };
  return {
    legalName: row.legalName,
    registrationType: row.registrationType,
    registrationYear: row.registrationYear,
    udyamNumber: row.udyamNumber,
    capacityNote: row.capacityNote,
    leadTimeNote: row.leadTimeNote,
    paymentTerms: row.paymentTerms,
    returnPolicy: row.returnPolicy,
    processSteps: row.processSteps,
    socialLinks: row.socialLinks,
    videos: row.videos,
    premisesPhotos: row.premisesPhotos,
  };
}

export function toCompanyProfilePublicDto(
  row: SellerProfile | undefined,
  seller: Seller,
): SellerCompanyProfileDto {
  return { ...toCompanyProfileOwnDto(row), gstinMasked: maskGstin(seller.gstNumber) };
}

export function toSellerOwnerDto(row: SellerOwner): SellerOwnerDto {
  return {
    id: row.id,
    fullName: row.fullName,
    designation: row.designation,
    photoUrl: row.photoUrl,
    bio: row.bio,
    yearsExperience: row.yearsExperience,
    languages: row.languages,
    isPrimary: row.isPrimary,
    sortOrder: row.sortOrder,
  };
}

export function toTeamMemberDto(row: SellerUser): SellerTeamMemberDto {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toBuyerProfileDto(row: Buyer): BuyerProfileDto {
  return {
    id: row.id,
    fullName: row.fullName,
    phone: row.phone,
    email: row.email,
    buyerType: row.buyerType,
    companyName: row.companyName,
    gstin: row.gstin,
    city: row.city,
    state: row.state,
    defaultAddress: row.defaultAddress,
    verificationStatus: row.verificationStatus,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toSellerProductDto(row: Product): SellerProductDto {
  return {
    ...toPublicProductDto(row),
    isPublished: row.isPublished,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toSellerInquiryDto(
  row: Inquiry,
  productName: string | null,
  extra: { buyerVerificationStatus?: SellerInquiryDto['buyerVerificationStatus']; orderId?: string | null } = {},
): SellerInquiryDto {
  return {
    id: row.id,
    productId: row.productId,
    productName,
    buyerId: row.buyerId,
    buyerVerificationStatus: extra.buyerVerificationStatus ?? null,
    buyerName: row.buyerName,
    buyerPhone: row.buyerPhone,
    buyerCity: row.buyerCity,
    buyerType: row.buyerType,
    quantity: row.quantity,
    message: row.message,
    source: row.source,
    status: row.status,
    sellerNotes: row.sellerNotes,
    orderId: extra.orderId ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toSellerOrderRequestDto(row: OrderRequest): SellerOrderRequestDto {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    buyerId: row.buyerId,
    inquiryId: row.inquiryId,
    buyerName: row.buyerName,
    buyerPhone: row.buyerPhone,
    deliveryAddress: row.deliveryAddress,
    orderType: row.orderType,
    eventDate: row.eventDate,
    items: row.items,
    status: row.status,
    transportPreference: row.transportPreference,
    freightTerm: row.freightTerm,
    buyerNotes: row.buyerNotes,
    quotedAmount: row.quotedAmount,
    agreedAmount: row.agreedAmount,
    expectedDeliveryOn: row.expectedDeliveryOn,
    sellerNotes: row.sellerNotes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toOrderEventDto(row: OrderEvent): OrderEventDto {
  return {
    id: row.id,
    status: row.status,
    actorType: row.actorType,
    actorName: row.actorName,
    note: row.note,
    visibleToBuyer: row.visibleToBuyer,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toShipmentDto(row: Shipment): ShipmentDto {
  return {
    id: row.id,
    status: row.status,
    transportName: row.transportName,
    transportPhone: row.transportPhone,
    transportBranch: row.transportBranch,
    lrNumber: row.lrNumber,
    lrDocumentUrl: row.lrDocumentUrl,
    vehicleNumber: row.vehicleNumber,
    driverPhone: row.driverPhone,
    packagesCount: row.packagesCount,
    dispatchedAt: iso(row.dispatchedAt),
    expectedDeliveryOn: row.expectedDeliveryOn,
    deliveredAt: iso(row.deliveredAt),
    notes: row.notes,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toDocumentDto(row: SellerDocument | BuyerDocument): DocumentDto {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    fileUrl: row.fileUrl,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    isPublic: row.isPublic,
    issuedOn: row.issuedOn,
    expiresOn: row.expiresOn,
    status: row.status,
    reviewedAt: iso(row.reviewedAt),
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toPublicDocumentDto(row: SellerDocument): PublicDocumentDto {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    fileUrl: row.fileUrl,
    mimeType: row.mimeType,
    issuedOn: row.issuedOn,
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
    priceTiers: [...row.priceTiers].sort((a, b) => a.minQty - b.minQty),
    wholesaleOnly: row.wholesaleOnly,
    priceOnRequest: row.priceOnRequest,
    stockStatus: row.stockStatus,
    listingType: row.listingType,
    media: row.media,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    updatedAt: row.updatedAt.toISOString(),
  };
}
