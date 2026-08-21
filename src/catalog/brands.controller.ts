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
import { BrandsService } from './brands.service';
import { CATALOG_EDITORS, CATALOG_READERS } from './catalog.roles';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

@Controller('brands')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CATALOG_READERS)
@ApiBearerAuth()
export class BrandsController {
  constructor(private readonly service: BrandsService) {}

  @Get()
  findAll(
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
  create(@Body() dto: CreateBrandDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(...CATALOG_EDITORS)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBrandDto) {
    return this.service.update(id, dto);
  }
}
