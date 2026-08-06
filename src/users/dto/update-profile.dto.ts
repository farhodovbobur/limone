import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { userFields } from './user-fields.schema';

export const updateProfileSchema = z.object({
  firstName: userFields.firstName.optional(),
  lastName: userFields.lastName.nullish(),
  phone: userFields.phone.nullish(),
  email: userFields.email.nullish(),
})
.strict();

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
