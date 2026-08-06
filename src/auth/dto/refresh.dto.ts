import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Moves to libs/shared with the Nx restructure so the admin UI reuses the same schema.
export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})
.strict();

export class RefreshDto extends createZodDto(refreshSchema) {}
