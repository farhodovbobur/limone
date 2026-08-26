import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { RolesGuard } from '../shared/guards/roles.guard';
import { BalanceQueryDto } from './dto/warehouse-query.dto';
import { WAREHOUSE_READERS } from './warehouse.roles';
import { WarehouseProductService } from './warehouse-product.service';

@Controller('warehouse-balances')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...WAREHOUSE_READERS)
@ApiBearerAuth()
export class WarehouseBalancesController {
  constructor(private readonly service: WarehouseProductService) {}

  @Get()
  list(@Query() query: BalanceQueryDto) {
    return this.service.balanceList(query);
  }

  @Get(':variantId')
  show(@Param('variantId', ParseIntPipe) variantId: number) {
    return this.service.balanceOf(variantId);
  }
}
