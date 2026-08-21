import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { BarcodeType, ProductBarcode } from './entities/product-barcode.entity';
import {
  normalizeCode,
  ProductBarcodesService,
} from './product-barcodes.service';
import { ProductVariantsService } from './product-variants.service';

type RepoMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  findOneBy: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
};

function makeService() {
  const repo: RepoMock = {
    find: jest.fn(),
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn().mockResolvedValue(null),
    create: jest.fn((row: Partial<ProductBarcode>) => row),
    save: jest.fn((row: Partial<ProductBarcode>) => row),
    delete: jest.fn(),
  };
  const variants = { findOne: jest.fn().mockResolvedValue({ id: 41 }) };
  const service = new ProductBarcodesService(
    repo as unknown as Repository<ProductBarcode>,
    variants as unknown as ProductVariantsService,
  );
  return { service, repo, variants };
}

describe('normalizeCode', () => {
  it('trims scanner whitespace and uppercases, nothing else', () => {
    expect(normalizeCode('  abc-123\n')).toBe('ABC-123');
  });
});

describe('resolve', () => {
  it('returns the variant for a known code, whatever its type', async () => {
    const { service, repo, variants } = makeService();
    repo.findOneBy.mockResolvedValue({ variantId: 41 });

    await expect(service.resolve('00000413')).resolves.toEqual({ id: 41 });
    expect(variants.findOne).toHaveBeenCalledWith(41);
  });

  it('a KNOWN eight-digit code with a bad check digit still resolves — lookup precedes diagnosis', async () => {
    const { service, repo } = makeService();
    repo.findOneBy.mockResolvedValue({ variantId: 41 });

    await expect(service.resolve('00000414')).resolves.toEqual({ id: 41 });
  });

  it('looks up the normalised form', async () => {
    const { service, repo } = makeService();
    repo.findOneBy.mockResolvedValue({ variantId: 41 });

    await service.resolve('  8690001234567\n');

    expect(repo.findOneBy).toHaveBeenCalledWith({ code: '8690001234567' });
  });

  it('400s our shape with a wrong check digit — mistype, not new goods', async () => {
    const { service } = makeService();

    await expect(service.resolve('00000414')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('404s an unknown valid-check eight-digit code — a learnable EAN-8', async () => {
    const { service } = makeService();

    // 96385074 is a real EAN-8 shape with a valid check digit.
    await expect(service.resolve('96385074')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('404s every other unknown code', async () => {
    const { service } = makeService();

    await expect(service.resolve('8690001234567')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('400s a repeated query key (array) instead of crashing', async () => {
    const { service } = makeService();

    await expect(service.resolve(['a', 'b'])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('400s a missing or blank code', async () => {
    const { service } = makeService();

    await expect(service.resolve(undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.resolve('   ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('learn', () => {
  it('rejects an EAN13 row that is not a valid EAN-13', async () => {
    const { service, repo } = makeService();

    await expect(
      service.learn(
        { variantId: 41, code: '4006381333930', type: BarcodeType.EAN13 },
        7,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('accepts a real EAN-13 and stamps the creator', async () => {
    const { service, repo } = makeService();

    await service.learn(
      { variantId: 41, code: ' 4006381333931 ', type: BarcodeType.EAN13 },
      7,
    );

    expect(repo.create).toHaveBeenCalledWith({
      variantId: 41,
      code: '4006381333931',
      type: BarcodeType.EAN13,
      note: null,
      createdBy: 7,
    });
  });

  it('names the holding variant on a duplicate', async () => {
    const { service, repo } = makeService();
    repo.findOne.mockResolvedValue({ variant: { sku: 'KOY01-M-QORA' } });

    await expect(
      service.learn(
        { variantId: 41, code: '8690001234567', type: BarcodeType.SUPPLIER },
        7,
      ),
    ).rejects.toThrow(/KOY01-M-QORA/);
  });

  it('refuses our own internal shape as a supplier code — it would squat a future variant', async () => {
    const { service, repo } = makeService();

    await expect(
      service.learn(
        { variantId: 41, code: '99999995', type: BarcodeType.SUPPLIER },
        7,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('measures length after normalisation — ß doubles on uppercasing', async () => {
    const { service, repo } = makeService();

    await expect(
      service.learn(
        { variantId: 41, code: 'ß'.repeat(20), type: BarcodeType.SUPPLIER },
        7,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('names the holder even when the race is lost', async () => {
    const { service, repo } = makeService();
    repo.findOne
      .mockResolvedValueOnce(null) // pre-check: free
      .mockResolvedValueOnce({ variant: { sku: 'KOY01-M-QORA' } }); // after 23505
    repo.save.mockRejectedValue(
      Object.assign(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('dup'), { code: '23505' }),
        ),
        {},
      ),
    );

    await expect(
      service.learn(
        { variantId: 41, code: 'abc-9', type: BarcodeType.SUPPLIER },
        7,
      ),
    ).rejects.toThrow(/KOY01-M-QORA/);
  });

  it('does not validate SUPPLIER codes — they are arbitrary by design', async () => {
    const { service, repo } = makeService();

    await service.learn(
      { variantId: 41, code: 'abc-123', type: BarcodeType.SUPPLIER },
      7,
    );

    expect(repo.save).toHaveBeenCalled();
  });
});

describe('remove', () => {
  it('refuses to delete an INTERNAL code', async () => {
    const { service, repo } = makeService();
    repo.findOneBy.mockResolvedValue({ id: 1, type: BarcodeType.INTERNAL });

    await expect(service.remove(1)).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('deletes a supplier code', async () => {
    const { service, repo } = makeService();
    repo.findOneBy.mockResolvedValue({ id: 1, type: BarcodeType.SUPPLIER });

    await service.remove(1);

    expect(repo.delete).toHaveBeenCalledWith(1);
  });

  it('404s an unknown id', async () => {
    const { service } = makeService();

    await expect(service.remove(99)).rejects.toBeInstanceOf(NotFoundException);
  });
});
