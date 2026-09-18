/**
 * Seed script — run with: pnpm --filter @tradekwik/api db:seed
 * Idempotent: wipes all tables and re-inserts the launch data.
 * DEV ONLY — never point this at a production database.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { createDb } from './client.js';
import {
  buyerDocuments,
  buyers,
  categories,
  inquiries,
  orderEvents,
  orderRequests,
  platformAdmins,
  products,
  sellerOwners,
  sellerProfiles,
  sellerDocuments,
  sellerUsers,
  sellers,
  shipments,
} from './schema.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy apps/api/.env.example to apps/api/.env first.');
  process.exit(1);
}

const { db, pool } = createDb(DATABASE_URL);

const SELLER_PASSWORD = 'seller123';
const ADMIN_PASSWORD = 'admin123';
const BUYER_PASSWORD = 'buyer123';

async function seed() {
  console.log('Wiping existing data...');
  await db.delete(orderEvents);
  await db.delete(shipments);
  await db.delete(sellerDocuments);
  await db.delete(buyerDocuments);
  await db.delete(inquiries);
  await db.delete(orderRequests);
  await db.delete(buyers);
  await db.delete(products);
  await db.delete(sellerUsers);
  await db.delete(sellers);
  await db.delete(platformAdmins);
  await db.delete(categories);

  console.log('Inserting categories...');
  const [embroideryCat, iceCreamCat, garmentsCat] = await db
    .insert(categories)
    .values([
      { name: 'Embroidery Machines', slug: 'embroidery-machines' },
      { name: 'Ice Cream & Desserts', slug: 'ice-cream-desserts' },
      { name: 'Garments & Tailoring', slug: 'garments-tailoring' },
    ])
    .returning();

  console.log('Inserting sellers...');
  const [embroiderySeller, iceCreamSeller, tailorSeller] = await db
    .insert(sellers)
    .values([
      {
        slug: 'shakti-embroidery-machines',
        businessName: 'Shakti Embroidery Machines',
        categoryId: embroideryCat.id,
        description:
          'Manufacturer of aari and dori embroidery machines since 2009. We supply single-head and multi-head machines to boutiques and garment units all over India, with installation support and one-year service warranty.',
        city: 'Surat',
        state: 'Gujarat',
        address: 'Plot 42, Pandesara GIDC, Surat, Gujarat 394221',
        phone: '+919876500001',
        whatsappNumber: '+919876500001',
        email: 'sales@shaktiembroidery.example.com',
        gstNumber: '24ABCDE1234F1Z5',
        isVerified: true,
        status: 'active',
        servesPanIndia: true,
        deliveryRadiusKm: null,
        sellerKind: 'manufacturer',
        foundedYear: 2009,
        teamSizeRange: '21-50',
        verifiedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        slug: 'meltz-ice-cream',
        businessName: 'Meltz Ice Cream & Desserts',
        categoryId: iceCreamCat.id,
        description:
          'Fresh, small-batch ice cream in 20+ flavours. Retail counter in Nagpur plus bulk party and event bookings — weddings, birthdays, corporate events. Advance booking with your choice of flavours.',
        city: 'Nagpur',
        state: 'Maharashtra',
        address: 'Shop 3, Dharampeth Main Road, Nagpur, Maharashtra 440010',
        phone: '+919876500002',
        whatsappNumber: '+919876500002',
        email: 'orders@meltz.example.com',
        gstNumber: null,
        isVerified: true,
        status: 'active',
        servesPanIndia: false,
        deliveryRadiusKm: 25,
        sellerKind: 'retailer',
        foundedYear: 2018,
        teamSizeRange: '6-20',
      },
      {
        slug: 'perfect-fit-tailors',
        businessName: 'Perfect Fit Tailors & Garments',
        categoryId: garmentsCat.id,
        description:
          'Ready-made coat-pant sets and formal trousers, plus custom stitching with doorstep measurement in Jaipur. Wedding and office wear specialists for 15 years.',
        city: 'Jaipur',
        state: 'Rajasthan',
        address: '21 Johari Bazar, Jaipur, Rajasthan 302003',
        phone: '+919876500003',
        whatsappNumber: '+919876500003',
        email: null,
        gstNumber: '08FGHIJ5678K2Z3',
        isVerified: false,
        status: 'active',
        servesPanIndia: false,
        deliveryRadiusKm: 40,
        sellerKind: 'retailer',
        foundedYear: 2011,
        teamSizeRange: '1-5',
      },
      {
        slug: 'gujarat-thread-and-trims',
        businessName: 'Gujarat Thread & Trims',
        categoryId: embroideryCat.id,
        description:
          'Wholesale supplier of embroidery threads, zari, sequins and trims to boutiques, job-workers and garment units. Carton quantities only, dispatched from our Surat godown within 24 hours.',
        city: 'Surat',
        state: 'Gujarat',
        address: 'Godown 7, Ring Road Textile Market, Surat, Gujarat 395002',
        phone: '+919876500004',
        whatsappNumber: '+919876500004',
        email: 'sales@gujaratthread.example.com',
        gstNumber: '24KLMNO9012P3Z7',
        isVerified: false,
        status: 'active',
        servesPanIndia: true,
        deliveryRadiusKm: null,
        sellerKind: 'wholesaler',
        foundedYear: 2014,
        teamSizeRange: '6-20',
      },
    ])
    .returning();
  const wholesaleSeller = (await db.select().from(sellers).where(eq(sellers.slug, 'gujarat-thread-and-trims')))[0];

  console.log('Inserting company profiles + owners...');
  await db.insert(sellerProfiles).values([
    {
      sellerId: embroiderySeller.id,
      legalName: 'Shakti Embroidery Machines Pvt. Ltd.',
      registrationType: 'private_limited',
      registrationYear: 2009,
      udyamNumber: 'UDYAM-GJ-22-0012345',
      capacityNote: '40 single-head and 8 multi-head machines per month. Larger orders scheduled in batches.',
      leadTimeNote: 'Single-head: ready stock, dispatch in 2-3 days. Multi-head: 4-6 weeks from advance.',
      paymentTerms: '50% advance with order, balance before dispatch. Bank transfer / UPI. GST invoice provided.',
      returnPolicy: '1-year on-site service warranty. Manufacturing defects replaced free within 30 days of installation.',
      processSteps: [
        { title: 'Frame fabrication', description: 'Laser-cut MS frames welded and powder-coated in-house.' },
        { title: 'Head assembly', description: 'Needle bars, hooks and motors fitted and aligned by trained fitters.' },
        { title: 'Quality check', description: 'Every machine runs a 2-hour stitch test on saree fabric before packing.' },
        { title: 'Packing & dispatch', description: 'Wooden crate packing; dispatched by transport with LR number shared on WhatsApp.' },
      ],
      socialLinks: [
        { platform: 'website', url: 'https://shaktiembroidery.example.com' },
        { platform: 'youtube', url: 'https://www.youtube.com/@shaktiembroidery' },
        { platform: 'instagram', url: 'https://www.instagram.com/shaktiembroidery' },
        { platform: 'indiamart', url: 'https://www.indiamart.com/shakti-embroidery' },
      ],
      videos: [
        { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'Factory tour — Pandesara unit' },
        { url: 'https://www.youtube.com/watch?v=ysz5S6PUM-U', title: 'Single-head aari machine demo' },
      ],
      premisesPhotos: [
        { url: 'https://placehold.co/800x600?text=Assembly%20Floor', alt: 'Assembly floor' },
        { url: 'https://placehold.co/800x600?text=Testing%20Bay', alt: 'Stitch testing bay' },
      ],
    },
    {
      sellerId: wholesaleSeller.id,
      legalName: 'Gujarat Thread & Trims',
      registrationType: 'partnership',
      registrationYear: 2014,
      udyamNumber: 'UDYAM-GJ-22-0098765',
      capacityNote: 'Stock of 400+ SKUs; 2,000 cartons dispatched per month.',
      leadTimeNote: 'Same-day dispatch for stock items ordered before 2 pm.',
      paymentTerms: 'Full advance for new buyers; 15-day credit for verified repeat buyers.',
      returnPolicy: 'Damaged cartons replaced if reported with photos within 48 hours of delivery.',
      processSteps: [],
      socialLinks: [{ platform: 'whatsapp_catalogue', url: 'https://wa.me/c/919876500004' }],
      videos: [],
      premisesPhotos: [],
    },
  ]);

  await db.insert(sellerOwners).values([
    {
      sellerId: embroiderySeller.id,
      fullName: 'Rakesh Patel',
      designation: 'Founder & Managing Director',
      photoUrl: 'https://placehold.co/300x300?text=RP',
      bio: 'Started as a machine fitter in 1998, founded Shakti in a 200 sq ft unit in 2009. Personally handles every multi-head installation.',
      yearsExperience: 26,
      languages: ['Gujarati', 'Hindi', 'English'],
      isPrimary: true,
      sortOrder: 0,
    },
    {
      sellerId: embroiderySeller.id,
      fullName: 'Meena Patel',
      designation: 'Director — Sales & Service',
      photoUrl: null,
      bio: 'Runs the service desk and the pan-India dealer network.',
      yearsExperience: 12,
      languages: ['Gujarati', 'Hindi'],
      isPrimary: false,
      sortOrder: 1,
    },
    {
      sellerId: iceCreamSeller.id,
      fullName: 'Sneha Deshmukh',
      designation: 'Owner',
      photoUrl: null,
      bio: 'Hotel-management graduate; started Meltz as a single counter in 2018.',
      yearsExperience: 8,
      languages: ['Marathi', 'Hindi', 'English'],
      isPrimary: true,
      sortOrder: 0,
    },
    {
      sellerId: wholesaleSeller.id,
      fullName: 'Harshad Mehta',
      designation: 'Partner',
      photoUrl: null,
      bio: 'Third-generation textile trader from Surat.',
      yearsExperience: 20,
      languages: ['Gujarati', 'Hindi'],
      isPrimary: true,
      sortOrder: 0,
    },
  ]);

  console.log('Inserting compliance documents...');
  const pdf = (name: string) => `https://placehold.co/800x1000?text=${encodeURIComponent(name)}`;
  const reviewedAt = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
  const verified = (kind: (typeof sellerDocuments.$inferInsert)['kind'], title: string, extra: Partial<typeof sellerDocuments.$inferInsert> = {}) => ({
    sellerId: embroiderySeller.id,
    kind,
    title,
    fileUrl: pdf(title),
    mimeType: 'image/png',
    sizeBytes: 120000,
    status: 'verified' as const,
    reviewedAt,
    ...extra,
  });
  await db.insert(sellerDocuments).values([
    verified('gst_certificate', 'GST certificate 24ABCDE1234F1Z5', { isPublic: true, issuedOn: '2017-07-01' }),
    verified('pan', 'PAN — Shakti Embroidery Machines Pvt Ltd'),
    verified('udyam', 'Udyam registration UDYAM-GJ-22-0012345', { isPublic: true, issuedOn: '2020-09-15' }),
    verified('bank_proof', 'Cancelled cheque — HDFC Bank'),
    verified('factory_license', 'Factory license — Pandesara GIDC', { issuedOn: '2024-04-01', expiresOn: '2027-03-31' }),
    verified('owner_id', 'Aadhaar — Rakesh Patel'),
    verified('iso', 'ISO 9001:2015 certificate', { isPublic: true, issuedOn: '2023-01-10', expiresOn: '2026-10-05' }),
    verified('brochure', 'Shakti machines brochure 2026', { isPublic: true }),
    // Gujarat Thread & Trims: uploaded, awaiting the verifier
    {
      sellerId: wholesaleSeller.id,
      kind: 'gst_certificate',
      title: 'GST certificate 24KLMNO9012P3Z7',
      fileUrl: pdf('GST Gujarat Thread'),
      mimeType: 'application/pdf',
      sizeBytes: 240000,
      status: 'pending',
    },
    {
      sellerId: wholesaleSeller.id,
      kind: 'pan',
      title: 'PAN — Gujarat Thread & Trims',
      fileUrl: pdf('PAN Gujarat Thread'),
      mimeType: 'application/pdf',
      sizeBytes: 90000,
      status: 'pending',
    },
    {
      sellerId: wholesaleSeller.id,
      kind: 'bank_proof',
      title: 'Cancelled cheque — SBI',
      fileUrl: pdf('Cheque Gujarat Thread'),
      mimeType: 'image/jpeg',
      sizeBytes: 150000,
      status: 'rejected',
      reviewedAt,
      rejectionReason: 'Cheque image is blurred; account number not readable.',
    },
  ]);

  console.log('Inserting seller users + platform admin...');
  const passwordHash = await bcrypt.hash(SELLER_PASSWORD, 10);
  await db.insert(sellerUsers).values([
    {
      sellerId: embroiderySeller.id,
      name: 'Rakesh Patel',
      phone: '+919876500001',
      email: 'rakesh@shaktiembroidery.example.com',
      passwordHash,
      role: 'owner',
    },
    {
      sellerId: iceCreamSeller.id,
      name: 'Sneha Deshmukh',
      phone: '+919876500002',
      email: 'sneha@meltz.example.com',
      passwordHash,
      role: 'owner',
    },
    {
      sellerId: tailorSeller.id,
      name: 'Imran Khan',
      phone: '+919876500003',
      email: null,
      passwordHash,
      role: 'owner',
    },
    {
      sellerId: wholesaleSeller.id,
      name: 'Harshad Mehta',
      phone: '+919876500004',
      email: 'harshad@gujaratthread.example.com',
      passwordHash,
      role: 'owner',
    },
    {
      sellerId: embroiderySeller.id,
      name: 'Vijay (Dispatch)',
      phone: '+919876500011',
      email: null,
      passwordHash,
      role: 'logistics',
    },
  ]);

  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await db.insert(platformAdmins).values([
    { name: 'TradeKwik Admin', email: 'admin@tradekwik.com', passwordHash: adminHash, role: 'super_admin' },
    { name: 'Verification Desk', email: 'verifier@tradekwik.com', passwordHash: adminHash, role: 'verifier' },
  ]);

  console.log('Inserting products...');
  const img = (name: string, alt: string) => ({
    type: 'image' as const,
    url: `https://placehold.co/800x600?text=${encodeURIComponent(name)}`,
    alt,
  });

  await db.insert(products).values([
    // ---- Shakti Embroidery Machines ----
    {
      sellerId: embroiderySeller.id,
      categoryId: embroideryCat.id,
      slug: 'aari-embroidery-machine-single-head',
      name: 'Aari Embroidery Machine — Single Head',
      description:
        'Compact single-head aari machine for boutiques and home businesses. Smooth chain-stitch for zardozi and aari work on sarees, lehengas and dress material. Includes motor, stand, and starter needle set. Free video training and 1-year service warranty.',
      specs: {
        'Machine type': 'Aari (chain stitch)',
        Heads: '1',
        'Motor power': '250 W',
        'Max speed': '1,100 stitches/min',
        'Working area': '60 cm x 40 cm',
        Warranty: '1 year on-site',
      },
      priceRetail: 24500,
      priceBulk: 22000,
      minBulkQty: 3,
      priceTiers: [
        { minQty: 3, price: 22000 },
        { minQty: 10, price: 20500 },
      ],
      stockStatus: 'in_stock',
      media: [
        img('Aari Single Head', 'Single head aari embroidery machine'),
        { type: 'video', url: 'https://example.com/videos/aari-single-head-demo.mp4', alt: 'Aari machine stitching demo' },
      ],
      isPublished: true,
      seoTitle: 'Aari Embroidery Machine (Single Head) — Price in India',
      seoDescription:
        'Buy single-head aari embroidery machine direct from Surat manufacturer. ₹24,500 with training and 1-year warranty. Pan-India delivery.',
    },
    {
      sellerId: embroiderySeller.id,
      categoryId: embroideryCat.id,
      slug: 'dori-embroidery-machine-heavy-duty',
      name: 'Dori Embroidery Machine — Heavy Duty',
      description:
        'Heavy-duty dori machine for cording and rope embroidery on bridal wear and furnishing fabric. Reinforced frame for continuous production use in garment units.',
      specs: {
        'Machine type': 'Dori (cording)',
        Heads: '1',
        'Motor power': '400 W',
        'Max speed': '900 stitches/min',
        Frame: 'Heavy-duty steel',
        Warranty: '1 year on-site',
      },
      priceRetail: 48000,
      priceBulk: 44000,
      minBulkQty: 2,
      stockStatus: 'in_stock',
      media: [img('Dori Heavy Duty', 'Heavy duty dori embroidery machine')],
      isPublished: true,
    },
    {
      sellerId: embroiderySeller.id,
      categoryId: embroideryCat.id,
      slug: 'multi-head-computerized-embroidery-machine-12-head',
      name: 'Computerized Embroidery Machine — 12 Head',
      description:
        'Production-grade 12-head computerized embroidery machine for factories. USB design input, 9-needle per head, automatic thread trimming. Installation and operator training included across India.',
      specs: {
        'Machine type': 'Computerized multi-head',
        Heads: '12',
        'Needles per head': '9',
        'Max speed': '1,000 rpm',
        'Design input': 'USB / LAN',
        'Power supply': '3-phase',
        Warranty: '2 years parts + service',
      },
      priceOnRequest: true,
      stockStatus: 'made_to_order',
      media: [
        img('12 Head Computerized', '12 head computerized embroidery machine'),
        { type: 'video', url: 'https://example.com/videos/12-head-demo.mp4', alt: '12-head machine running production' },
      ],
      isPublished: true,
      seoTitle: '12 Head Computerized Embroidery Machine — Manufacturer Price',
    },
    {
      sellerId: embroiderySeller.id,
      categoryId: embroideryCat.id,
      slug: 'aari-machine-spare-needle-set',
      name: 'Aari Machine Spare Needle Set (50 pcs)',
      description:
        'Genuine spare needles for all Shakti aari machines. Pack of 50. Bulk rates for garment units and resellers.',
      specs: {
        'Pack size': '50 needles',
        Compatibility: 'All Shakti aari models',
        Material: 'Hardened steel',
      },
      priceRetail: 750,
      priceBulk: 550,
      minBulkQty: 10,
      priceTiers: [
        { minQty: 10, price: 550 },
        { minQty: 50, price: 480 },
        { minQty: 200, price: 420 },
      ],
      stockStatus: 'in_stock',
      listingType: 'accessory',
      media: [img('Needle Set', 'Aari machine spare needle set')],
      isPublished: true,
    },

    {
      sellerId: embroiderySeller.id,
      categoryId: embroideryCat.id,
      slug: 'aari-embroidery-frame-adda-wooden',
      name: 'Aari Embroidery Frame (Adda) — Wooden, Adjustable',
      description:
        'Seasoned teak wooden adda frame for hand aari and zardozi work. Adjustable width for sarees, dupattas and lehenga panels. Comes with clamps and tensioning rods.',
      specs: {
        Material: 'Seasoned teak',
        'Width range': '90 cm to 180 cm',
        Includes: 'Frame, 4 clamps, 2 tension rods',
      },
      priceRetail: 3200,
      priceBulk: 2800,
      minBulkQty: 5,
      stockStatus: 'in_stock',
      listingType: 'tool',
      media: [img('Wooden Adda Frame', 'Adjustable wooden aari embroidery frame')],
      isPublished: true,
    },

    // ---- Gujarat Thread & Trims (wholesaler) ----
    {
      sellerId: wholesaleSeller.id,
      categoryId: embroideryCat.id,
      slug: 'viscose-embroidery-thread-120d-2-box-of-100',
      name: 'Viscose Embroidery Thread 120D/2 — Box of 100 cones',
      description:
        'High-sheen viscose rayon embroidery thread, 120D/2, 5,000 m cones. 200+ shades. Sold by the box of 100 cones (single shade or assorted).',
      specs: { Material: 'Viscose rayon', Count: '120D/2', 'Cone length': '5,000 m', 'Box size': '100 cones' },
      priceRetail: null,
      priceBulk: 3200,
      minBulkQty: 1,
      priceTiers: [
        { minQty: 1, price: 3200 },
        { minQty: 10, price: 3000 },
        { minQty: 50, price: 2800 },
      ],
      wholesaleOnly: true,
      stockStatus: 'in_stock',
      listingType: 'product',
      media: [img('Viscose Thread Box', 'Box of viscose embroidery thread cones')],
      isPublished: true,
      seoTitle: 'Viscose Embroidery Thread 120D/2 Wholesale — Box of 100',
    },
    {
      sellerId: wholesaleSeller.id,
      categoryId: embroideryCat.id,
      slug: 'zari-thread-golden-carton-50-spools',
      name: 'Golden Zari Thread — Carton of 50 spools',
      description:
        'Imitation golden zari for aari, zardozi and machine embroidery. 50 spools of 1,000 m per carton.',
      specs: { Type: 'Imitation zari', 'Spool length': '1,000 m', 'Carton size': '50 spools' },
      priceRetail: null,
      priceBulk: 4500,
      minBulkQty: 1,
      priceTiers: [
        { minQty: 1, price: 4500 },
        { minQty: 20, price: 4200 },
      ],
      wholesaleOnly: true,
      stockStatus: 'in_stock',
      listingType: 'product',
      media: [img('Golden Zari Carton', 'Carton of golden zari spools')],
      isPublished: true,
    },
    {
      sellerId: wholesaleSeller.id,
      categoryId: embroideryCat.id,
      slug: 'sequins-assorted-1kg-pack',
      name: 'Sequins Assorted Colours — 1 kg pack',
      description: 'Flat 4 mm sequins, assorted colours. Minimum order 10 packs.',
      specs: { Size: '4 mm', Pack: '1 kg' },
      priceRetail: null,
      priceBulk: 380,
      minBulkQty: 10,
      priceTiers: [
        { minQty: 10, price: 380 },
        { minQty: 100, price: 340 },
      ],
      wholesaleOnly: true,
      stockStatus: 'in_stock',
      listingType: 'accessory',
      media: [img('Sequins 1kg', 'Assorted sequins pack')],
      isPublished: true,
    },

    // ---- Meltz Ice Cream ----
    {
      sellerId: iceCreamSeller.id,
      categoryId: iceCreamCat.id,
      slug: 'party-pack-4l-tub',
      name: 'Party Pack Tub — 4 Litre',
      description:
        'Family/party tub in your choice of flavour. Serves 25–30 scoops. Order 2 days in advance for parties; free delivery within Nagpur city.',
      specs: {
        Size: '4 litre tub',
        Serves: '25-30 scoops',
        Flavours: 'Vanilla, Chocolate, Strawberry, Butterscotch, Kesar Pista, Mango',
        'Advance notice': '2 days',
      },
      priceRetail: 850,
      priceBulk: 700,
      minBulkQty: 5,
      stockStatus: 'made_to_order',
      media: [img('4L Party Tub', '4 litre ice cream party tub')],
      isPublished: true,
    },
    {
      sellerId: iceCreamSeller.id,
      categoryId: iceCreamCat.id,
      slug: 'wedding-event-ice-cream-counter',
      name: 'Wedding / Event Ice Cream Counter',
      description:
        'Live ice cream counter for weddings and corporate events: uniformed staff, chest freezer, cups, cones and toppings. Choose 4–8 flavours. Booking with date, venue and guest count.',
      specs: {
        'Service type': 'Live counter with staff',
        'Flavour choices': '4-8',
        'Minimum guests': '100',
        Includes: 'Freezer, cups, cones, toppings, 2 staff',
        'Advance booking': '7 days',
      },
      priceOnRequest: true,
      stockStatus: 'made_to_order',
      listingType: 'service',
      media: [img('Event Counter', 'Ice cream counter at a wedding')],
      isPublished: true,
      seoTitle: 'Ice Cream Counter for Weddings & Events in Nagpur',
    },
    {
      sellerId: iceCreamSeller.id,
      categoryId: iceCreamCat.id,
      slug: 'kulfi-box-12',
      name: 'Matka Kulfi Box (12 pcs)',
      description:
        'Traditional matka kulfi in kesar, malai and pista. Box of 12 — great for small gatherings. Same-day delivery within city limits.',
      specs: {
        'Pack size': '12 kulfis',
        Flavours: 'Kesar, Malai, Pista (mix allowed)',
        Delivery: 'Same day within Nagpur',
      },
      priceRetail: 600,
      stockStatus: 'in_stock',
      media: [img('Kulfi Box', 'Box of matka kulfi')],
      isPublished: true,
    },
    {
      sellerId: iceCreamSeller.id,
      categoryId: iceCreamCat.id,
      slug: 'sugar-free-tub-1l',
      name: 'Sugar-Free Vanilla Tub — 1 Litre',
      description:
        'Sugar-free vanilla made with stevia. 1 litre tub, ideal for diabetic-friendly desserts.',
      specs: {
        Size: '1 litre tub',
        Sweetener: 'Stevia',
        Flavour: 'Vanilla',
      },
      priceRetail: 420,
      stockStatus: 'in_stock',
      media: [img('Sugar Free 1L', 'Sugar-free vanilla ice cream tub')],
      isPublished: false,
    },

    // ---- Perfect Fit Tailors ----
    {
      sellerId: tailorSeller.id,
      categoryId: garmentsCat.id,
      slug: 'ready-made-coat-pant-classic-black',
      name: 'Ready-Made Coat-Pant Set — Classic Black',
      description:
        '2-piece formal coat-pant set in premium terry rayon. Slim and regular fits, sizes 36–46. Ideal for weddings and office wear. Alteration included at our Jaipur shop.',
      specs: {
        Fabric: 'Terry rayon',
        Colour: 'Classic black',
        Sizes: '36-46',
        Fit: 'Slim / Regular',
        Includes: 'Coat + trouser, free alteration',
      },
      priceRetail: 5499,
      priceBulk: 4800,
      minBulkQty: 10,
      stockStatus: 'in_stock',
      media: [img('Black Coat Pant', 'Classic black coat pant set')],
      isPublished: true,
      seoTitle: 'Ready-Made Coat Pant Set in Jaipur — ₹5,499',
    },
    {
      sellerId: tailorSeller.id,
      categoryId: garmentsCat.id,
      slug: 'formal-trousers-cotton-blend',
      name: 'Formal Trousers — Cotton Blend',
      description:
        'Comfort-fit formal trousers in navy, grey, beige and black. Wrinkle-resistant cotton blend. Bulk rates for uniforms and corporate orders.',
      specs: {
        Fabric: 'Cotton blend',
        Colours: 'Navy, Grey, Beige, Black',
        Sizes: '28-44',
        Care: 'Machine washable',
      },
      priceRetail: 1299,
      priceBulk: 999,
      minBulkQty: 20,
      stockStatus: 'in_stock',
      media: [img('Formal Trousers', 'Cotton blend formal trousers')],
      isPublished: true,
    },
    {
      sellerId: tailorSeller.id,
      categoryId: garmentsCat.id,
      slug: 'custom-stitched-suit-3-piece',
      name: 'Custom Stitched 3-Piece Suit',
      description:
        'Made-to-measure 3-piece suit stitched to your measurements. Choose fabric at our shop or send your own. Doorstep measurement within Jaipur; 10-day delivery.',
      specs: {
        Type: 'Custom / made-to-measure',
        Pieces: 'Coat, waistcoat, trouser',
        Measurement: 'Doorstep (Jaipur) or size chart',
        'Delivery time': '10 days',
      },
      priceOnRequest: true,
      stockStatus: 'made_to_order',
      listingType: 'service',
      media: [img('3 Piece Suit', 'Custom stitched three piece suit')],
      isPublished: true,
    },
    {
      sellerId: tailorSeller.id,
      categoryId: garmentsCat.id,
      slug: 'wedding-sherwani-custom',
      name: 'Custom Wedding Sherwani',
      description:
        'Hand-finished wedding sherwani with custom embroidery options. Book 3 weeks before your event. Includes two fittings.',
      specs: {
        Type: 'Custom / made-to-measure',
        'Lead time': '3 weeks',
        Includes: '2 fittings, matching stole',
        Embroidery: 'Zardozi / threadwork options',
      },
      priceOnRequest: true,
      stockStatus: 'made_to_order',
      listingType: 'service',
      media: [img('Wedding Sherwani', 'Custom wedding sherwani')],
      isPublished: true,
    },
  ]);

  console.log('Inserting demo buyer + orders...');
  const [buyer] = await db
    .insert(buyers)
    .values({
      fullName: 'Priya Sharma',
      phone: '+919876500099',
      email: 'priya@boutique.example.com',
      passwordHash: await bcrypt.hash(BUYER_PASSWORD, 10),
      buyerType: 'business',
      companyName: 'Priya Boutique',
      gstin: '27PQRST3456U1Z9',
      city: 'Pune',
      state: 'Maharashtra',
      defaultAddress: 'Shop 12, FC Road, Pune, Maharashtra 411004',
      verificationStatus: 'review_pending',
      verificationRequestedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    })
    .returning();
  await db.insert(buyerDocuments).values({
    buyerId: buyer.id,
    kind: 'gst_certificate',
    title: 'GST certificate — Priya Boutique',
    fileUrl: 'https://placehold.co/800x1000?text=GST%20Priya%20Boutique',
    mimeType: 'application/pdf',
    sizeBytes: 200000,
    status: 'pending',
  });

  const aariMachine = (await db.select().from(products).where(eq(products.slug, 'aari-embroidery-machine-single-head')))[0];
  const needleSet = (await db.select().from(products).where(eq(products.slug, 'aari-machine-spare-needle-set')))[0];

  const [inq] = await db
    .insert(inquiries)
    .values({
      sellerId: embroiderySeller.id,
      productId: aariMachine.id,
      buyerId: buyer.id,
      buyerName: buyer.fullName,
      buyerPhone: buyer.phone,
      buyerCity: 'Pune',
      buyerType: 'business',
      quantity: 2,
      message: 'Need 2 single-head machines for my boutique. Can you deliver to Pune and what is the bulk price?',
      source: 'product_page',
      status: 'won',
      sellerNotes: 'Quoted 22,000 each incl. training. Converted to order.',
    })
    .returning();

  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  const [order1] = await db
    .insert(orderRequests)
    .values({
      sellerId: embroiderySeller.id,
      buyerId: buyer.id,
      inquiryId: inq.id,
      buyerName: buyer.fullName,
      buyerPhone: buyer.phone,
      deliveryAddress: 'Shop 12, FC Road, Pune, Maharashtra 411004',
      orderType: 'bulk',
      items: [{ productId: aariMachine.id, name: aariMachine.name, qty: 2, unitPrice: 22000 }],
      status: 'dispatched',
      transportPreference: 'VRL Logistics, Pune (Market Yard) branch',
      freightTerm: 'to_pay',
      quotedAmount: 44000,
      agreedAmount: 44000,
      expectedDeliveryOn: daysAgo(-3).toISOString().slice(0, 10),
      createdAt: daysAgo(6),
    })
    .returning();

  await db.insert(shipments).values({
    orderRequestId: order1.id,
    status: 'in_transit',
    transportName: 'VRL Logistics',
    transportPhone: '+919876511111',
    transportBranch: 'Surat (Sachin GIDC) → Pune (Market Yard)',
    lrNumber: 'VRL-SRT-2026-118834',
    lrDocumentUrl: 'https://placehold.co/800x1000?text=Bilty%20VRL-SRT-2026-118834',
    vehicleNumber: 'GJ05 AT 4471',
    driverPhone: '+919876522222',
    packagesCount: 2,
    dispatchedAt: daysAgo(1),
    expectedDeliveryOn: daysAgo(-3).toISOString().slice(0, 10),
    notes: 'Wooden crates. Freight to-pay at Pune branch.',
  });

  await db.insert(orderEvents).values([
    { orderRequestId: order1.id, status: 'new', actorType: 'buyer', actorId: buyer.id, actorName: buyer.fullName, note: 'Order request placed.', createdAt: daysAgo(6) },
    { orderRequestId: order1.id, status: 'confirmed', actorType: 'seller', actorName: 'Rakesh Patel', note: 'Confirmed 2 units at ₹22,000 each incl. training. 50% advance received.', createdAt: daysAgo(5) },
    { orderRequestId: order1.id, status: 'in_progress', actorType: 'seller', actorName: 'Rakesh Patel', note: 'Machines under final testing.', createdAt: daysAgo(3) },
    { orderRequestId: order1.id, status: 'ready', actorType: 'seller', actorName: 'Vijay (Dispatch)', note: 'Packed in wooden crates, balance payment received.', createdAt: daysAgo(2) },
    { orderRequestId: order1.id, status: null, actorType: 'seller', actorName: 'Vijay (Dispatch)', note: 'Transport booked: VRL Logistics, LR/bilty no. VRL-SRT-2026-118834.', createdAt: daysAgo(1) },
    { orderRequestId: order1.id, status: 'dispatched', actorType: 'seller', actorName: 'Vijay (Dispatch)', note: 'Left Surat godown. Call VRL Pune branch for delivery.', createdAt: daysAgo(1) },
  ]);

  const [order2] = await db
    .insert(orderRequests)
    .values({
      sellerId: embroiderySeller.id,
      buyerId: buyer.id,
      buyerName: buyer.fullName,
      buyerPhone: buyer.phone,
      deliveryAddress: 'Shop 12, FC Road, Pune, Maharashtra 411004',
      orderType: 'bulk',
      items: [{ productId: needleSet.id, name: needleSet.name, qty: 20, unitPrice: 550 }],
      status: 'completed',
      freightTerm: 'included',
      quotedAmount: 11000,
      agreedAmount: 11000,
      createdAt: daysAgo(30),
    })
    .returning();
  await db.insert(shipments).values({
    orderRequestId: order2.id,
    status: 'delivered',
    transportName: 'Delhivery Surface',
    lrNumber: 'DLV-7788-2201',
    dispatchedAt: daysAgo(28),
    deliveredAt: daysAgo(25),
    expectedDeliveryOn: daysAgo(25).toISOString().slice(0, 10),
  });
  await db.insert(orderEvents).values([
    { orderRequestId: order2.id, status: 'new', actorType: 'buyer', actorId: buyer.id, actorName: buyer.fullName, note: 'Order request placed.', createdAt: daysAgo(30) },
    { orderRequestId: order2.id, status: 'confirmed', actorType: 'seller', actorName: 'Rakesh Patel', createdAt: daysAgo(29) },
    { orderRequestId: order2.id, status: 'dispatched', actorType: 'seller', actorName: 'Vijay (Dispatch)', note: 'Sent by courier, LR DLV-7788-2201.', createdAt: daysAgo(28) },
    { orderRequestId: order2.id, status: 'completed', actorType: 'buyer', actorId: buyer.id, actorName: buyer.fullName, note: 'Received in good condition.', createdAt: daysAgo(25) },
  ]);

  const counts = {
    categories: 3,
    sellers: 4,
    sellerUsers: 5,
    platformAdmins: 1,
    products: 16,
    buyers: 1,
    orders: 2,
    sellerDocuments: 11,
  };
  console.log('Seed complete:', counts);
  console.log('\nLogin credentials (dev only):');
  console.log(`  Sellers  → phone +919876500001 / 02 / 03 / 04 (owners), +919876500011 (logistics staff), password: ${SELLER_PASSWORD}`);
  console.log(`  Buyer    → phone +919876500099, password: ${BUYER_PASSWORD}`);
  console.log(`  Admin    → admin@tradekwik.com, password: ${ADMIN_PASSWORD}`);
  console.log(`  Verifier → verifier@tradekwik.com, password: ${ADMIN_PASSWORD}`);
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
