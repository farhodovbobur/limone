import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { FindOptionsWhere, Not, Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { RoleCode } from '../shared/enums/role.enum';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly authService: AuthService,
  ) {}

  async create(dto: CreateUserDto) {
    await this.assertFree(
      { username: dto.username },
      'Username already in use',
    );
    if (dto.email != null) {
      await this.assertFree({ email: dto.email }, 'Email already in use');
    }
    if (dto.phone != null) {
      await this.assertFree({ phone: dto.phone }, 'Phone already in use');
    }

    const role = await this.findRole(dto.role);
    const user = await this.userRepo.save(
      this.userRepo.create({
        username: dto.username,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        firstName: dto.firstName,
        lastName: dto.lastName ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        roleId: role.id,
      }),
    );

    return this.findOne(user.id);
  }

  async findAll() {
    const users = await this.userRepo.find({
      relations: { role: true },
      order: { id: 'ASC' },
    });
    return users.map((user) => this.toSafeUser(user));
  }

  async findOne(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: { role: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toSafeUser(user);
  }

  async update(id: number, dto: UpdateUserDto, actorId?: number) {
    const exists = await this.userRepo.existsBy({ id });
    if (!exists) {
      throw new NotFoundException('User not found');
    }
    if (dto.isActive === false && actorId !== undefined && id === actorId) {
      throw new BadRequestException('Cannot deactivate your own account');
    }
    if (dto.email != null) {
      await this.assertFree({ email: dto.email }, 'Email already in use', id);
    }
    if (dto.phone != null) {
      await this.assertFree({ phone: dto.phone }, 'Phone already in use', id);
    }

    const patch: Partial<User> = {};
    if (dto.firstName !== undefined) patch.firstName = dto.firstName;
    if (dto.lastName !== undefined) patch.lastName = dto.lastName;
    if (dto.phone !== undefined) patch.phone = dto.phone;
    if (dto.email !== undefined) patch.email = dto.email;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (dto.role !== undefined) {
      patch.roleId = (await this.findRole(dto.role)).id;
    }

    if (Object.keys(patch).length > 0) {
      await this.userRepo.update(id, patch);
    }

    // Deactivation kills every session: no refresh possible, the last access
    // token dies on its own within ACCESS_TOKEN_TTL (<= 15m).
    if (dto.isActive === false) {
      await this.authService.revokeAllUserTokens(id);
    }

    return this.findOne(id);
  }

  async resetPassword(id: number, newPassword: string): Promise<void> {
    const exists = await this.userRepo.existsBy({ id });
    if (!exists) {
      throw new NotFoundException('User not found');
    }
    await this.userRepo.update(id, {
      passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS),
    });
    await this.authService.revokeAllUserTokens(id);
  }

  private async assertFree(
    where: FindOptionsWhere<User>,
    message: string,
    excludeId?: number,
  ): Promise<void> {
    if (excludeId !== undefined) {
      where.id = Not(excludeId);
    }
    if (await this.userRepo.existsBy(where)) {
      throw new ConflictException(message);
    }
  }

  private async findRole(code: RoleCode): Promise<Role> {
    const role = await this.roleRepo.findOneBy({ name: code });
    if (!role) {
      throw new BadRequestException(`Unknown role: ${code}`);
    }
    return role;
  }

  private toSafeUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email,
      role: user.role.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
