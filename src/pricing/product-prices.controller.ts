import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { AccessTokenPayload } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { Roles } from '../shared/decorators/roles.decorator';
import { RolesGuard } from '../shared/guards/roles.guard';
import { CreateProductPriceDto } from './dto/product-price.dto';
import { PRICE_EDITORS, PRICE_READERS } from './pricing.roles';
import { ProductPricesService } from './product-prices.service';

@Controller('product-prices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...PRICE_READERS)
@ApiBearerAuth()
export class ProductPricesController {
  constructor(private readonly service: ProductPricesService) {}

  @Get()
  list(
    @Query('date') date?: unknown,
    @Query('productId', new ParseIntPipe({ optional: true }))
    productId?: number,
  ) {
    return this.service.list(date, productId);
  }

  @Get('variant/:id')
  history(@Param('id', ParseIntPipe) id: number) {
    return this.service.history(id);
  }

  @Post()
  @Roles(...PRICE_EDITORS)
  create(
    @Body() dto: CreateProductPriceDto,
    @CurrentUser() actor: AccessTokenPayload,
  ) {
    return this.service.create(dto, actor.sub);
  }
}
