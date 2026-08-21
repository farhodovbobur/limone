import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { CATALOG_EDITORS, CATALOG_READERS } from './catalog.roles';
import { CreateProductBarcodeDto } from './dto/product-barcode.dto';
import { ProductBarcodesService } from './product-barcodes.service';

@Controller('product-barcodes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CATALOG_READERS)
@ApiBearerAuth()
export class ProductBarcodesController {
  constructor(private readonly service: ProductBarcodesService) {}

  /** The codes shown on a variant card. */
  @Get()
  list(@Query('variantId', ParseIntPipe) variantId: number) {
    return this.service.list(variantId);
  }

  @Post()
  @Roles(...CATALOG_EDITORS)
  learn(
    @Body() dto: CreateProductBarcodeDto,
    @CurrentUser() actor: AccessTokenPayload,
  ) {
    return this.service.learn(dto, actor.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(...CATALOG_EDITORS)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
