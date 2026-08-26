import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductVariant } from '../catalog/entities/product-variant.entity';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { ProductPrice } from './entities/product-price.entity';
import { ProductPricesController } from './product-prices.controller';
import { ProductPricesService } from './product-prices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductPrice, ProductVariant]),
    ExchangeRatesModule,
  ],
  controllers: [ProductPricesController],
  providers: [ProductPricesService],
  exports: [ProductPricesService],
})
export class PricingModule {}
