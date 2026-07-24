import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { Role } from '../../users/entities/role.entity';
import { User } from '../../users/entities/user.entity';
import { RoleCode } from '../../shared/enums/role.enum';

const BCRYPT_ROUNDS = 10;
const TEMP_PASSWORD = '123';

const ACCOUNTS = [
  {
    username: 'superadmin',
    firstName: 'Superadmin',
    role: RoleCode.SUPERADMIN,
  },
  {
    username: 'admin',
    firstName: 'Admin',
    role: RoleCode.ADMIN,
  },
];

export default class CreateAdminSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const userRepo = dataSource.getRepository(User);
    const roleRepo = dataSource.getRepository(Role);

    for (const account of ACCOUNTS) {
      const exists = await userRepo.existsBy({ username: account.username });
      if (exists) {
        console.log(`Seed: "${account.username}" already exists — skipping.`);
        continue;
      }

      const role = await roleRepo.findOneByOrFail({ name: account.role });

      await userRepo.save(
        userRepo.create({
          username: account.username,
          firstName: account.firstName,
          passwordHash: await bcrypt.hash(TEMP_PASSWORD, BCRYPT_ROUNDS),
          roleId: role.id,
        }),
      );

      console.log(`Seed: "${account.username}" created.`);
    }
  }
}
