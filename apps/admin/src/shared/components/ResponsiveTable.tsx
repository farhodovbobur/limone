import { Pagination, Spin, Table } from 'antd';
import type { TableProps } from 'antd';
import type { ColumnType } from 'antd/es/table';
import { Fragment, type Key, type ReactNode, useState } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';

export type CardSlot = 'title' | 'badge' | 'meta' | 'actions';

export type ResponsiveColumn<T> = ColumnType<T> & { card?: CardSlot };

const TABLE_QUERY = '(min-width: 768px)';

interface ResponsiveTableProps<T> extends Omit<TableProps<T>, 'columns'> {
  columns: ResponsiveColumn<T>[];
}

export function ResponsiveTable<T extends object>(
  props: ResponsiveTableProps<T>,
) {
  const asTable = useMediaQuery(TABLE_QUERY);
  return asTable ? <Table<T> {...props} /> : <StackedList {...props} />;
}

const isSpanWrapper = (v: unknown): v is { children?: ReactNode } =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  !('$$typeof' in v) &&
  'children' in v;

/** Reads a cell the way AntD would, so column `render`s behave identically. */
function cellOf<T>(col: ResponsiveColumn<T>, row: T, index: number): ReactNode {
  const value =
    col.dataIndex == null
      ? undefined
      : (row as Record<string, unknown>)[String(col.dataIndex)];
  if (!col.render) return value as ReactNode;
  const rendered = col.render(value, row, index);
  return isSpanWrapper(rendered)
    ? (rendered.children ?? null)
    : (rendered as ReactNode);
}

const columnKey = <T,>(col: ResponsiveColumn<T>, i: number): Key =>
  col.key ?? (col.dataIndex == null ? i : String(col.dataIndex));

function StackedList<T extends object>({
  columns,
  dataSource,
  rowKey,
  loading,
  locale,
  pagination,
}: ResponsiveTableProps<T>) {
  const [page, setPage] = useState(1);
  const rows = dataSource ?? [];

  const slot = (name: CardSlot) => columns.filter((c) => c.card === name);
  const titles = slot('title');
  const badges = slot('badge');
  const metas = slot('meta');
  const actions = slot('actions');

  const pageSize = pagination === false ? 0 : (pagination?.pageSize ?? 10);
  const pageCount = pageSize
    ? Math.max(1, Math.ceil(rows.length / pageSize))
    : 1;
  const current = Math.min(page, pageCount);
  const from = pageSize ? (current - 1) * pageSize : 0;
  const visible = pageSize ? rows.slice(from, from + pageSize) : rows;

  if (loading) {
    return (
      <div className="flex justify-center px-5 py-14">
        <Spin />
      </div>
    );
  }

  if (rows.length === 0) {
    const empty = locale?.emptyText;
    return <>{typeof empty === 'function' ? empty() : empty}</>;
  }

  const rowKeyOf = (row: T, i: number): Key => {
    if (typeof rowKey === 'function') return rowKey(row, i);
    if (typeof rowKey === 'string') {
      return (row as Record<string, unknown>)[rowKey] as Key;
    }
    return i;
  };

  return (
    <div>
      <div className="divide-y divide-line/60">
        {visible.map((row, i) => (
          <div
            key={rowKeyOf(row, i)}
            className="flex flex-col gap-2.5 px-4 py-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {titles.map((c, ci) => (
                  <Fragment key={columnKey(c, ci)}>
                    {cellOf(c, row, i)}
                  </Fragment>
                ))}
              </div>
              {actions.length > 0 && (
                <div className="flex shrink-0 items-center">
                  {actions.map((c, ci) => (
                    <Fragment key={columnKey(c, ci)}>
                      {cellOf(c, row, i)}
                    </Fragment>
                  ))}
                </div>
              )}
            </div>

            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {badges.map((c, ci) => (
                  <Fragment key={columnKey(c, ci)}>
                    {cellOf(c, row, i)}
                  </Fragment>
                ))}
              </div>
            )}

            {metas.length > 0 && (
              <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
                {metas.map((c, ci) => (
                  <Fragment key={columnKey(c, ci)}>
                    <dt className="text-ink-tertiary">
                      {typeof c.title === 'function' ? null : c.title}
                    </dt>
                    <dd className="m-0 min-w-0 text-ink-secondary">
                      {cellOf(c, row, i)}
                    </dd>
                  </Fragment>
                ))}
              </dl>
            )}
          </div>
        ))}
      </div>

      {pagination !== false && (
        <div className="flex flex-col items-center gap-2 border-t border-line/60 px-4 py-3.5">
          {pagination?.showTotal && (
            <span className="text-xs text-ink-tertiary">
              {pagination.showTotal(rows.length, [
                from + 1,
                from + visible.length,
              ])}
            </span>
          )}
          <Pagination
            size="small"
            current={current}
            pageSize={pageSize}
            total={rows.length}
            onChange={setPage}
            showSizeChanger={false}
            hideOnSinglePage={pagination?.hideOnSinglePage}
          />
        </div>
      )}
    </div>
  );
}
