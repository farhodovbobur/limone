import {
  DataSource,
  DeepPartial,
  EntityTarget,
  FindOptionsWhere,
  ObjectLiteral,
} from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { Color } from '../../catalog/entities/color.entity';
import { Size } from '../../catalog/entities/size.entity';

const SIZES: [name: string, sortOrder: number][] = [
  ['XS', 10],
  ['S', 20],
  ['M', 30],
  ['L', 40],
  ['XL', 50],
  ['2XL', 60],
  ['3XL', 70],
  ['42', 100],
  ['44', 110],
  ['46', 120],
  ['48', 130],
  ['50', 140],
  ['52', 150],
  ['54', 160],
  ['56', 170],
];

const COLORS: [name: string, ru: string, en: string, hex: string][] = [
  ['Qora', 'Чёрный', 'Black', '#000000'],
  ['Oq', 'Белый', 'White', '#FFFFFF'],
  ['Kulrang', 'Серый', 'Grey', '#808080'],
  ["To'q kulrang", 'Тёмно-серый', 'Dark grey', '#4B5563'],
  ["Ko'k", 'Синий', 'Blue', '#2563EB'],
  ["To'q ko'k", 'Тёмно-синий', 'Navy', '#1E3A5F'],
  ['Havorang', 'Голубой', 'Light blue', '#7DD3FC'],
  ['Qizil', 'Красный', 'Red', '#DC2626'],
  ['Bordo', 'Бордовый', 'Burgundy', '#7F1D1D'],
  ['Yashil', 'Зелёный', 'Green', '#16A34A'],
  ['Zaytun', 'Оливковый', 'Olive', '#6B7A3A'],
  ['Sariq', 'Жёлтый', 'Yellow', '#FACC15'],
  ['Bej', 'Бежевый', 'Beige', '#E7D3B3'],
  ['Krem', 'Кремовый', 'Cream', '#FFF8E7'],
  ['Jigarrang', 'Коричневый', 'Brown', '#78350F'],
  ['Pushti', 'Розовый', 'Pink', '#F9A8D4'],
  ['Binafsha', 'Фиолетовый', 'Purple', '#7C3AED'],
];

async function insertMissing<T extends ObjectLiteral & { name: string }>(
  dataSource: DataSource,
  entity: EntityTarget<T>,
  rows: DeepPartial<T>[],
  label: string,
): Promise<void> {
  const repo = dataSource.getRepository(entity);
  let created = 0;

  for (const row of rows) {
    const where = { name: row.name } as FindOptionsWhere<T>;
    if (await repo.existsBy(where)) {
      continue;
    }
    await repo.save(repo.create(row));
    created += 1;
  }

  console.log(
    `Seed: ${created} ${label} created, ${rows.length - created} already present.`,
  );
}

export default class CreateCatalogReferenceSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    await insertMissing(
      dataSource,
      Size,
      SIZES.map(([name, sortOrder]) => ({
        name,
        sortOrder,
        translations: { uz: name },
      })),
      'size(s)',
    );

    await insertMissing(
      dataSource,
      Color,
      COLORS.map(([name, ru, en, hex]) => ({
        name,
        hex,
        translations: { uz: name, ru, en },
      })),
      'colour(s)',
    );
  }
}
