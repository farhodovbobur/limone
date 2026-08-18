import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { RolesGuard } from '../shared/guards/roles.guard';
import { CATALOG_EDITORS, CATALOG_READERS } from './catalog.roles';
import { CreateSizeDto, UpdateSizeDto } from './dto/size.dto';
import { SizesService } from './sizes.service';

@Controller('sizes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CATALOG_READERS)
@ApiBearerAuth()
export class SizesController {
  constructor(private readonly service: SizesService) {}

  @Get()
  findAll(
    // Inactive rows stay out unless asked for: the picker lists what is
    // usable today, the settings screen lists everything.
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive: boolean,
  ) {
    return this.service.findAll(includeInactive);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(...CATALOG_EDITORS)
  create(@Body() dto: CreateSizeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(...CATALOG_EDITORS)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSizeDto) {
    return this.service.update(id, dto);
  }
}
