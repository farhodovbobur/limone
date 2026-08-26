import { EntityManager } from 'typeorm';

export async function nextDocumentNumber(
  em: EntityManager,
  prefix: string,
  date: string,
): Promise<string> {
  const scope = `${prefix}-${date.slice(0, 4)}`;
  const rows: { current: string }[] = await em.query(
    `INSERT INTO document_counters AS c (scope, current) VALUES ($1, 1)
       ON CONFLICT (scope) DO UPDATE SET current = c.current + 1
     RETURNING c.current`,
    [scope],
  );
  return `${scope}-${rows[0].current.padStart(6, '0')}`;
}
