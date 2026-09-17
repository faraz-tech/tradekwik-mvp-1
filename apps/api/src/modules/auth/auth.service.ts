import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type {
  AdminLoginInput,
  AuthUserDto,
  LoginResponseDto,
  SellerLoginInput,
} from '@tradekwik/shared';
import { DB } from '../../db/db.module.js';
import type { Database } from '../../db/client.js';
import { platformAdmins, sellerUsers, sellers } from '../../db/schema.js';
import type { JwtPayload } from './jwt-payload.js';

const BAD_CREDENTIALS = 'Incorrect phone/email or password.';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly jwtService: JwtService,
  ) {}

  async loginSeller(input: SellerLoginInput): Promise<LoginResponseDto> {
    // phone is stored with +91 prefix; accept both forms
    const phone = input.phone.startsWith('+91') ? input.phone : `+91${input.phone}`;
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

    const user: AuthUserDto = {
      role: 'seller',
      id: row.user.id,
      name: row.user.name,
      phone: row.user.phone,
      sellerId: row.seller.id,
      businessName: row.seller.businessName,
      sellerUserRole: row.user.role,
    };
    return { token: this.sign({ sub: row.user.id, role: 'seller', sellerId: row.seller.id }), user };
  }

  async loginAdmin(input: AdminLoginInput): Promise<LoginResponseDto> {
    const [admin] = await this.db
      .select()
      .from(platformAdmins)
      .where(eq(platformAdmins.email, input.email.toLowerCase()))
      .limit(1);

    if (!admin || !(await bcrypt.compare(input.password, admin.passwordHash))) {
      throw new UnauthorizedException(BAD_CREDENTIALS);
    }

    const user: AuthUserDto = {
      role: 'admin',
      id: admin.id,
      name: admin.name,
      email: admin.email,
    };
    return { token: this.sign({ sub: admin.id, role: 'admin' }), user };
  }

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
      return {
        role: 'seller',
        id: row.user.id,
        name: row.user.name,
        phone: row.user.phone,
        sellerId: row.seller.id,
        businessName: row.seller.businessName,
        sellerUserRole: row.user.role,
      };
    }

    const [admin] = await this.db
      .select()
      .from(platformAdmins)
      .where(eq(platformAdmins.id, payload.sub))
      .limit(1);
    if (!admin) throw new UnauthorizedException('Account no longer exists.');
    return { role: 'admin', id: admin.id, name: admin.name, email: admin.email };
  }

  private sign(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }
}
