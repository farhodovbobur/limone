import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
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
import {
  CreateExchangeRateDto,
  UpdateExchangeRateDto,
} from './dto/exchange-rate.dto';
import { RATE_EDITORS, RATE_READERS } from './exchange-rates.roles';
import { ExchangeRatesService } from './exchange-rates.service';

@Controller('exchange-rates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...RATE_READERS)
@ApiBearerAuth()
export class ExchangeRatesController {
  constructor(private readonly service: ExchangeRatesService) {}

  @Get()
  findAll(
    @Query('limit', new DefaultValuePipe(90), ParseIntPipe) limit: number,
  ) {
    return this.service.findAll(limit);
  }

  @Get('effective')
  findEffective(@Query('date') date: string) {
    return this.service.findEffective(date);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(...RATE_EDITORS)
  create(@Body() dto: CreateExchangeRateDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(...RATE_EDITORS)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExchangeRateDto,
  ) {
    return this.service.update(id, dto);
  }
}
