import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { and, eq, isNull, or, gt } from 'drizzle-orm';
import {
  ADMIN_ROLE_PERMISSIONS,
  SELLER_ROLE_PERMISSIONS,
  type AdminLoginInput,
  type AuthUserDto,
  type BuyerLoginInput,
  type BuyerRegisterInput,
  type LoginResponseDto,
  type SellerLoginInput,
  type SellerRegisterInput,
  type SellerRegisterResponseDto,
} from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import {
  adminAccessCodes,
  adminAllowedIps,
  buyers,
  categories,
  inquiries,
  orderRequests,
  platformAdmins,
  sellerUsers,
  sellers,
  type Buyer,
  type PlatformAdmin,
  type Seller,
  type SellerUser,
} from '../../db/schema.js';
import type { JwtPayload } from './jwt-payload.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { OtpService } from '../otp/otp.service.js';

const BAD_CREDENTIALS = 'Incorrect phone/email or password.';

export function normalizePhone(phone: string): string {
  return phone.startsWith('+91') ? phone : `+91${phone}`;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .slice(0, 180) || 'store'
  );
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly jwtService: JwtService,
    private readonly notifications: NotificationsService,
    private readonly otp: OtpService,
  ) {}

  // ---------- seller ----------

  /** Public sign-up: creates a pending store + its owner login. An admin approves it later. */
  async registerSeller(input: SellerRegisterInput): Promise<SellerRegisterResponseDto> {
    this.otp.assertVerified(input.otpToken, input.loginPhone, 'seller_register');
    const [category] = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, input.categoryId))
      .limit(1);
    if (!category) throw new BadRequestException('Please pick a valid category.');

    const loginPhone = normalizePhone(input.loginPhone);
    const [taken] = await this.db
      .select({ id: sellerUsers.id })
      .from(sellerUsers)
      .where(eq(sellerUsers.phone, loginPhone))
      .limit(1);
    if (taken) {
      throw new BadRequestException('A seller account with this mobile number already exists. Please log in.');
    }

    const slug = await this.uniqueSellerSlug(slugify(input.businessName));
    const passwordHash = await bcrypt.hash(input.password, 10);

    const seller = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(sellers)
        .values({
          slug,
          businessName: input.businessName,
          categoryId: input.categoryId,
          sellerKind: input.sellerKind,
          description: input.description ?? null,
          city: input.city,
          state: input.state,
          phone: normalizePhone(input.phone),
          whatsappNumber: normalizePhone(input.whatsappNumber),
          email: input.email ?? null,
          gstNumber: input.gstNumber ?? null,
          servesPanIndia: input.servesPanIndia,
          status: 'pending',
        })
        .returning();
      await tx.insert(sellerUsers).values({
        sellerId: created.id,
        name: input.ownerName,
        phone: loginPhone,
        email: input.email ?? null,
        passwordHash,
        role: 'owner',
      });
      return created;
    });

    await this.notifications.sendWhatsApp(
      seller.whatsappNumber,
      `[TradeKwik] Thanks for registering ${seller.businessName}. We review new sellers within one working day and will message you when your store is live.`,
    );
    await this.notifications.sendEmail(
      process.env.ADMIN_NOTIFY_EMAIL ?? 'tradekwik.team@gmail.com',
      `New seller registration: ${seller.businessName}`,
      `${seller.businessName} (${input.sellerKind}) from ${seller.city}, ${seller.state} registered and is awaiting approval. Owner ${input.ownerName}, ${loginPhone}.`,
    );

    return { sellerId: seller.id, businessName: seller.businessName, slug: seller.slug, status: 'pending' };
  }

  private async uniqueSellerSlug(base: string): Promise<string> {
    let candidate = base;
    for (let attempt = 2; attempt < 50; attempt++) {
      const [existing] = await this.db.select({ id: sellers.id }).from(sellers).where(eq(sellers.slug, candidate)).limit(1);
      if (!existing) return candidate;
      candidate = `${base}-${attempt}`;
    }
    throw new BadRequestException('Could not create a store address; please use a different business name.');
  }

  async loginSeller(input: SellerLoginInput): Promise<LoginResponseDto> {
    const phone = normalizePhone(input.phone);
    const [row] = await this.db
      .select({ user: sellerUsers, seller: sellers })
      .from(sellerUsers)
      .innerJoin(sellers, eq(sellerUsers.sellerId, sellers.id))
      .where(eq(sellerUsers.phone, phone))
      .limit(1);

    if (!row || !(await bcrypt.compare(input.password, row.user.passwordHash))) {
      throw new UnauthorizedException(BAD_CREDENTIALS);
    }
    if (row.seller.status !== 'active') {
      throw new UnauthorizedException(
        row.seller.status === 'pending'
          ? 'Your store is awaiting approval. We will notify you once it is live.'
          : 'This store account is suspended. Contact TradeKwik support.',
      );
    }

    const user = this.sellerUser(row.user, row.seller);
    return {
      token: this.sign({
        sub: row.user.id,
        role: 'seller',
        sellerId: row.seller.id,
        sellerUserRole: row.user.role,
      }),
      user,
    };
  }

  private sellerUser(user: SellerUser, seller: Seller): AuthUserDto {
    return {
      role: 'seller',
      id: user.id,
      name: user.name,
      phone: user.phone,
      sellerId: seller.id,
      businessName: seller.businessName,
      sellerSlug: seller.slug,
      sellerUserRole: user.role,
      permissions: [...SELLER_ROLE_PERMISSIONS[user.role]],
    };
  }

  // ---------- admin ----------

  /** Normalise Express IPs: "::ffff:127.0.0.1" → "127.0.0.1", "::1" stays. */
  private static cleanIp(ip: string | undefined): string {
    return (ip ?? '').replace(/^::ffff:/, '').trim();
  }

  /** True when the request IP is in `admin_allowed_ips` (active). */
  async isAdminIpAllowed(rawIp: string | undefined): Promise<boolean> {
    const ip = AuthService.cleanIp(rawIp);
    if (!ip) return false;
    const [row] = await this.db
      .select({ id: adminAllowedIps.id })
      .from(adminAllowedIps)
      .where(and(eq(adminAllowedIps.ip, ip), eq(adminAllowedIps.isActive, true)))
      .limit(1);
    return Boolean(row);
  }

  /** Throws a plain 404 so the endpoint looks non-existent to outsiders. */
  async assertAdminIp(rawIp: string | undefined): Promise<void> {
    if (!(await this.isAdminIpAllowed(rawIp))) throw new NotFoundException('Not found.');
  }

  async loginAdmin(input: AdminLoginInput, rawIp?: string): Promise<LoginResponseDto> {
    await this.assertAdminIp(rawIp);

    const [code] = await this.db
      .select()
      .from(adminAccessCodes)
      .where(
        and(
          eq(adminAccessCodes.code, input.accessCode),
          eq(adminAccessCodes.isActive, true),
          or(isNull(adminAccessCodes.expiresAt), gt(adminAccessCodes.expiresAt, new Date())),
        ),
      )
      .limit(1);
    if (!code) throw new UnauthorizedException(BAD_CREDENTIALS);
    await this.db.update(adminAccessCodes).set({ lastUsedAt: new Date() }).where(eq(adminAccessCodes.id, code.id));

    const [admin] = await this.db
      .select()
      .from(platformAdmins)
      .where(eq(platformAdmins.email, input.email.toLowerCase()))
      .limit(1);

    if (!admin || !(await bcrypt.compare(input.password, admin.passwordHash))) {
      throw new UnauthorizedException(BAD_CREDENTIALS);
    }

    return {
      token: this.sign({ sub: admin.id, role: 'admin', adminRole: admin.role }),
      user: this.adminUser(admin),
    };
  }

  private adminUser(admin: PlatformAdmin): AuthUserDto {
    return {
      role: 'admin',
      id: admin.id,
      name: admin.name,
      email: admin.email,
      adminRole: admin.role,
      permissions: [...ADMIN_ROLE_PERMISSIONS[admin.role]],
    };
  }

  // ---------- buyer ----------

  async registerBuyer(input: BuyerRegisterInput): Promise<LoginResponseDto> {
    const phone = normalizePhone(input.phone);
    this.otp.assertVerified(input.otpToken, phone, 'buyer_register');
    const [taken] = await this.db
      .select({ id: buyers.id })
      .from(buyers)
      .where(eq(buyers.phone, phone))
      .limit(1);
    if (taken) {
      throw new BadRequestException('An account with this mobile number already exists. Please log in.');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const [buyer] = await this.db
      .insert(buyers)
      .values({
        fullName: input.fullName,
        phone,
        email: input.email ?? null,
        passwordHash,
        buyerType: input.buyerType,
        companyName: input.companyName ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        verificationStatus: 'phone_verified',
      })
      .returning();

    // Claim earlier guest inquiries / orders sent from this phone number.
    await Promise.all([
      this.db
        .update(inquiries)
        .set({ buyerId: buyer.id })
        .where(and(eq(inquiries.buyerPhone, phone), isNull(inquiries.buyerId))),
      this.db
        .update(orderRequests)
        .set({ buyerId: buyer.id })
        .where(and(eq(orderRequests.buyerPhone, phone), isNull(orderRequests.buyerId))),
    ]);

    return { token: this.sign({ sub: buyer.id, role: 'buyer' }), user: this.buyerUser(buyer) };
  }

  async loginBuyer(input: BuyerLoginInput): Promise<LoginResponseDto> {
    const phone = normalizePhone(input.phone);
    const [buyer] = await this.db.select().from(buyers).where(eq(buyers.phone, phone)).limit(1);
    if (!buyer || !(await bcrypt.compare(input.password, buyer.passwordHash))) {
      throw new UnauthorizedException(BAD_CREDENTIALS);
    }
    return { token: this.sign({ sub: buyer.id, role: 'buyer' }), user: this.buyerUser(buyer) };
  }

  private buyerUser(buyer: Buyer): AuthUserDto {
    return {
      role: 'buyer',
      id: buyer.id,
      name: buyer.fullName,
      phone: buyer.phone,
      email: buyer.email,
      buyerType: buyer.buyerType,
      companyName: buyer.companyName,
      city: buyer.city,
      state: buyer.state,
      verificationStatus: buyer.verificationStatus,
    };
  }

  // ---------- me ----------

  /** Resolve the current principal from a verified JWT payload. */
  async getMe(payload: JwtPayload): Promise<AuthUserDto> {
    if (payload.role === 'seller') {
      const [row] = await this.db
        .select({ user: sellerUsers, seller: sellers })
        .from(sellerUsers)
        .innerJoin(sellers, eq(sellerUsers.sellerId, sellers.id))
        .where(eq(sellerUsers.id, payload.sub))
        .limit(1);
      if (!row) throw new UnauthorizedException('Account no longer exists.');
      return this.sellerUser(row.user, row.seller);
    }

    if (payload.role === 'buyer') {
      const [buyer] = await this.db.select().from(buyers).where(eq(buyers.id, payload.sub)).limit(1);
      if (!buyer) throw new UnauthorizedException('Account no longer exists.');
      return this.buyerUser(buyer);
    }

    const [admin] = await this.db
      .select()
      .from(platformAdmins)
      .where(eq(platformAdmins.id, payload.sub))
      .limit(1);
    if (!admin) throw new UnauthorizedException('Account no longer exists.');
    return this.adminUser(admin);
  }

  private sign(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }
}
