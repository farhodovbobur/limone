import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ColorsController } from './colors.controller';
import { ColorsService } from './colors.service';
import { Color } from './entities/color.entity';
import { ProductCategory } from './entities/product-category.entity';
import { Size } from './entities/size.entity';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductCategoriesService } from './product-categories.service';
import { SizesController } from './sizes.controller';
import { SizesService } from './sizes.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductCategory, Size, Color])],
  controllers: [ProductCategoriesController, SizesController, ColorsController],
  providers: [ProductCategoriesService, SizesService, ColorsService],
  exports: [ProductCategoriesService, SizesService, ColorsService],
})
export class CatalogModule {}
