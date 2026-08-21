import { catalogFields } from './dto/catalog-fields.schema';

describe('catalogFields — Latin-only names', () => {
  it.each([
    ['Qora', true],
    ["To'q ko'k", true],
    ['46', true],
    ['Йщкф', false], // "qora" typed with the RU layout still active
    ['Кўйлак', false],
    ['Qora Чёрный', false], // one Cyrillic word poisons the whole name
  ])('colorName «%s» → %s', (value, ok) => {
    expect(catalogFields.colorName.safeParse(value).success).toBe(ok);
  });

  it('applies to every SKU-feeding field, not just colours', () => {
    const fields = [
      catalogFields.categoryName,
      catalogFields.sizeName,
      catalogFields.productName,
      catalogFields.productCode,
      catalogFields.sku,
    ];
    for (const field of fields) {
      expect(field.safeParse('Йщкф').success).toBe(false);
      expect(field.safeParse('Qora').success).toBe(true);
    }
  });

  it('leaves translations free — ru is Cyrillic by design', () => {
    expect(catalogFields.translations.safeParse({ ru: 'Чёрный' }).success).toBe(
      true,
    );
  });
});
