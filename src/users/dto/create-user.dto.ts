import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { RoleCode } from '../../shared/enums/role.enum';
import { userFields } from './user-fields.schema';

export const createUserSchema = z.object({
  username: userFields.username,
  password: userFields.password,
  firstName: userFields.firstName,
  lastName: userFields.lastName.nullish(),
  phone: userFields.phone.nullish(),
  email: userFields.email.nullish(),
  role: z.enum(RoleCode),
})
.strict();

export class CreateUserDto extends createZodDto(createUserSchema) {}
