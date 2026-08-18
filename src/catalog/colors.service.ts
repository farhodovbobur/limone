import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Color } from './entities/color.entity';
import { ReferenceService } from './reference.service';

@Injectable()
export class ColorsService extends ReferenceService<Color> {
  constructor(@InjectRepository(Color) repo: Repository<Color>) {
    super(repo, 'Color', { name: 'ASC' });
  }
}
