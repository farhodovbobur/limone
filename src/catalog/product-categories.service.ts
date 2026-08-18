import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductCategory } from './entities/product-category.entity';
import { ReferenceService } from './reference.service';

@Injectable()
export class ProductCategoriesService extends ReferenceService<ProductCategory> {
  constructor(
    @InjectRepository(ProductCategory) repo: Repository<ProductCategory>,
  ) {
    super(repo, 'Category', { name: 'ASC' });
  }
}
