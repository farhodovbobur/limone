import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ColorsController } from './colors.controller';
import { ColorsService } from './colors.service';
import { Color } from './entities/color.entity';
import { ProductBarcode } from './entities/product-barcode.entity';
import { ProductCategory } from './entities/product-category.entity';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { Size } from './entities/size.entity';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductCategoriesService } from './product-categories.service';
import { ProductBarcodesController } from './product-barcodes.controller';
import { ProductBarcodesService } from './product-barcodes.service';
import { ProductVariantsController } from './product-variants.controller';
import { ProductVariantsService } from './product-variants.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { SizesController } from './sizes.controller';
import { SizesService } from './sizes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductCategory,
      Size,
      Color,
      Product,
      ProductVariant,
      ProductBarcode,
    ]),
  ],
  controllers: [
    ProductCategoriesController,
    SizesController,
    ColorsController,
    ProductsController,
    ProductVariantsController,
    ProductBarcodesController,
  ],
  providers: [
    ProductCategoriesService,
    SizesService,
    ColorsService,
    ProductsService,
    ProductVariantsService,
    ProductBarcodesService,
  ],
  exports: [
    ProductCategoriesService,
    SizesService,
    ColorsService,
    ProductsService,
    ProductVariantsService,
    ProductBarcodesService,
  ],
})
export class CatalogModule {}
