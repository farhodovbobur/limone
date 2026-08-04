import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { userFields } from './user-fields.schema';

export const updateProfileSchema = z
  .object({
    firstName: userFields.firstName,
    lastName: userFields.lastName,
    phone: userFields.phone.nullable().optional(),
    email: userFields.email.nullable().optional(),
  })
  .strict();

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
