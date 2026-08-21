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
import {
  CreateProductVariantDto,
  ProductVariantMatrixDto,
  UpdateProductVariantDto,
} from './dto/product-variant.dto';
import { ProductVariantsService } from './product-variants.service';

@Controller('product-variants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CATALOG_READERS)
@ApiBearerAuth()
export class ProductVariantsController {
  constructor(private readonly service: ProductVariantsService) {}

  @Get()
  list(
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive: boolean,
    @Query('productId', new ParseIntPipe({ optional: true }))
    productId?: number,
    @Query('sizeId', new ParseIntPipe({ optional: true })) sizeId?: number,
    @Query('colorId', new ParseIntPipe({ optional: true })) colorId?: number,
  ) {
    return this.service.list({ includeInactive, productId, sizeId, colorId });
  }

  /** Above `:id`, or "matrix" reaches the id handler and 400s. */
  @Post('matrix')
  @Roles(...CATALOG_EDITORS)
  createMatrix(@Body() dto: ProductVariantMatrixDto) {
    return this.service.createMatrix(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(...CATALOG_EDITORS)
  create(@Body() dto: CreateProductVariantDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(...CATALOG_EDITORS)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.service.update(id, dto);
  }
}
