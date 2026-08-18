import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Size } from './entities/size.entity';
import { ReferenceService } from './reference.service';

@Injectable()
export class SizesService extends ReferenceService<Size> {
  constructor(@InjectRepository(Size) repo: Repository<Size>) {
    // sortOrder first: "S, M, L, XL" is the whole reason the column exists.
    super(repo, 'Size', { sortOrder: 'ASC', name: 'ASC' });
  }
}
