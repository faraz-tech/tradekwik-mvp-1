/**
 * Seed script — run with: pnpm --filter @tradekwik/api db:seed
 * Idempotent: wipes all tables and re-inserts the launch data.
 * DEV ONLY — never point this at a production database.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createDb } from './client.js';
import {
  categories,
  inquiries,
  orderRequests,
  platformAdmins,
  products,
  sellerUsers,
  sellers,
} from './schema.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Copy apps/api/.env.example to apps/api/.env first.');
  process.exit(1);
}

const { db, pool } = createDb(DATABASE_URL);

const SELLER_PASSWORD = 'seller123';
const ADMIN_PASSWORD = 'admin123';

async function seed() {
  console.log('Wiping existing data...');
  await db.delete(inquiries);
  await db.delete(orderRequests);
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
      },
    ])
    .returning();

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
  ]);

  await db.insert(platformAdmins).values({
    name: 'TradeKwik Admin',
    email: 'admin@tradekwik.com',
    passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
  });

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
      stockStatus: 'in_stock',
      media: [img('Needle Set', 'Aari machine spare needle set')],
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
      media: [img('Wedding Sherwani', 'Custom wedding sherwani')],
      isPublished: true,
    },
  ]);

  const counts = {
    categories: 3,
    sellers: 3,
    sellerUsers: 3,
    platformAdmins: 1,
    products: 12,
  };
  console.log('Seed complete:', counts);
  console.log('\nLogin credentials (dev only):');
  console.log(`  Sellers  → phone +919876500001 / +919876500002 / +919876500003, password: ${SELLER_PASSWORD}`);
  console.log(`  Admin    → admin@tradekwik.com, password: ${ADMIN_PASSWORD}`);
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
