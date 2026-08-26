import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { AccessTokenPayload } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../shared/decorators/current-user.decorator';
import { Roles } from '../shared/decorators/roles.decorator';
import { RolesGuard } from '../shared/guards/roles.guard';
import {
  CreateCountDto,
  CreateIssueDto,
  CreateOpeningDto,
  CreateReversalDto,
} from './dto/warehouse-movement.dto';
import { MovementQueryDto } from './dto/warehouse-query.dto';
import { WAREHOUSE_EDITORS, WAREHOUSE_READERS } from './warehouse.roles';
import { WarehouseProductService } from './warehouse-product.service';

@Controller('warehouse-movements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...WAREHOUSE_READERS)
@ApiBearerAuth()
export class WarehouseMovementsController {
  constructor(private readonly service: WarehouseProductService) {}

  @Get()
  history(@Query() query: MovementQueryDto) {
    return this.service.history(query);
  }

  @Post('opening')
  @Roles(...WAREHOUSE_EDITORS)
  opening(
    @Body() dto: CreateOpeningDto,
    @CurrentUser() actor: AccessTokenPayload,
  ) {
    return this.service.opening(dto, actor.sub);
  }

  @Post('issue')
  @Roles(...WAREHOUSE_EDITORS)
  issue(@Body() dto: CreateIssueDto, @CurrentUser() actor: AccessTokenPayload) {
    return this.service.issue(dto, actor.sub);
  }

  @Post('count')
  @Roles(...WAREHOUSE_EDITORS)
  count(@Body() dto: CreateCountDto, @CurrentUser() actor: AccessTokenPayload) {
    return this.service.count(dto, actor.sub);
  }

  @Post('reversal')
  @Roles(...WAREHOUSE_EDITORS)
  reversal(
    @Body() dto: CreateReversalDto,
    @CurrentUser() actor: AccessTokenPayload,
  ) {
    return this.service.reverse(dto, actor.sub);
  }
}
