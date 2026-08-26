import { ConflictException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { isUniqueViolation } from '../shared/db-errors';
import { ReferenceRow, ReferenceService } from './reference.service';

type RepoMock = {
  find: jest.Mock;
  findOneBy: jest.Mock;
  existsBy: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
};

class TestService extends ReferenceService<ReferenceRow> {
  constructor(repo: Repository<ReferenceRow>) {
    super(repo, 'Thing', { name: 'ASC' });
  }
}

function makeService() {
  const repo: RepoMock = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    existsBy: jest.fn().mockResolvedValue(false),
    create: jest.fn((row: Partial<ReferenceRow>) => row),
    save: jest.fn((row: Partial<ReferenceRow>) => row),
    update: jest.fn(),
  };
  const service = new TestService(repo as unknown as Repository<ReferenceRow>);
  return { service, repo };
}

const row = (over: Partial<ReferenceRow> = {}): ReferenceRow => ({
  id: 1,
  name: 'Qora',
  translations: { uz: 'Qora' },
  isActive: true,
  ...over,
});

/** The driver error shape node-postgres produces for a unique violation. */
const uniqueViolation = () =>
  new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('duplicate key'), { code: '23505' }),
  );

describe('isUniqueViolation', () => {
  it('recognises 23505 and nothing else', () => {
    expect(isUniqueViolation(uniqueViolation())).toBe(true);
    expect(
      isUniqueViolation(
        new QueryFailedError(
          'q',
          [],
          Object.assign(new Error('fk'), { code: '23503' }),
        ),
      ),
    ).toBe(false);
    expect(isUniqueViolation(new Error('random'))).toBe(false);
  });
});

describe('ReferenceService', () => {
  describe('create', () => {
    it('defaults translations.uz to the name', async () => {
      const { service, repo } = makeService();

      await service.create({ name: 'Qora' });

      expect(repo.create).toHaveBeenCalledWith({
        name: 'Qora',
        translations: { uz: 'Qora' },
      });
    });

    it('keeps a deliberately different uz label', async () => {
      const { service, repo } = makeService();

      await service.create({
        name: 'Qora',
        translations: { uz: 'Qora rang', ru: 'Чёрный' },
      });

      expect(repo.create).toHaveBeenCalledWith({
        name: 'Qora',
        translations: { uz: 'Qora rang', ru: 'Чёрный' },
      });
    });

    it('fills uz when only other locales are sent', async () => {
      const { service, repo } = makeService();

      await service.create({ name: 'Qora', translations: { ru: 'Чёрный' } });

      expect(repo.create).toHaveBeenCalledWith({
        name: 'Qora',
        translations: { ru: 'Чёрный', uz: 'Qora' },
      });
    });

    it('maps a raced unique violation to 409', async () => {
      const { service, repo } = makeService();
      repo.save.mockRejectedValue(uniqueViolation());

      await expect(service.create({ name: 'Qora' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('answers an empty patch as a no-op without touching the database', async () => {
      const { service, repo } = makeService();
      repo.findOneBy.mockResolvedValue(row());

      const result = await service.update(1, {});

      expect(result).toEqual(row());
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('leaves translations alone on a name-only rename (documented, D16)', async () => {
      const { service, repo } = makeService();
      repo.findOneBy.mockResolvedValue(row());

      await service.update(1, { name: "To'q qora" });

      expect(repo.update).toHaveBeenCalledWith(1, { name: "To'q qora" });
    });

    it('re-defaults uz from the new name when translations ride along', async () => {
      const { service, repo } = makeService();
      repo.findOneBy.mockResolvedValue(row());

      await service.update(1, {
        name: "To'q qora",
        translations: { ru: 'Тёмно-чёрный' },
      });

      expect(repo.update).toHaveBeenCalledWith(1, {
        name: "To'q qora",
        translations: { ru: 'Тёмно-чёрный', uz: "To'q qora" },
      });
    });

    it('maps a raced unique violation to 409', async () => {
      const { service, repo } = makeService();
      repo.findOneBy.mockResolvedValue(row());
      repo.update.mockRejectedValue(uniqueViolation());

      await expect(service.update(1, { name: 'Oq' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});
