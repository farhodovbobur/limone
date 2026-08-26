import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductVariant } from '../catalog/entities/product-variant.entity';
import { DocumentCounter } from './entities/document-counter.entity';
import { WarehouseProductBalance } from './entities/warehouse-product-balance.entity';
import { WarehouseProductDocument } from './entities/warehouse-product-document.entity';
import { WarehouseProductMovement } from './entities/warehouse-product-movement.entity';
import { WarehouseLedgerService } from './warehouse-ledger.service';
import { WarehouseBalancesController } from './warehouse-balances.controller';
import { WarehouseMovementsController } from './warehouse-movements.controller';
import { WarehouseProductService } from './warehouse-product.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WarehouseProductDocument,
      WarehouseProductMovement,
      WarehouseProductBalance,
      DocumentCounter,
      ProductVariant,
    ]),
  ],
  controllers: [WarehouseBalancesController, WarehouseMovementsController],
  providers: [WarehouseLedgerService, WarehouseProductService],
  exports: [WarehouseLedgerService, WarehouseProductService],
})
export class WarehouseModule {}
