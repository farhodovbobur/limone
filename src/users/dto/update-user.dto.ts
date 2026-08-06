import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { RoleCode } from '../../shared/enums/role.enum';
import { userFields } from './user-fields.schema';

export const updateUserSchema = z.object({
  firstName: userFields.firstName,
  lastName: userFields.lastName.nullable(),
  phone: userFields.phone.nullable(),
  email: userFields.email.nullable(),
  role: z.enum(RoleCode),
  isActive: z.boolean(),
})
.partial()
.strict();

export class UpdateUserDto extends createZodDto(updateUserSchema) {}
