const SIZES = { md: 'h-8 w-8 text-[13px]', lg: 'h-10 w-10 text-[15px]' };

export function Avatar({
  first,
  last,
  size = 'md',
}: {
  first: string;
  last?: string | null;
  size?: keyof typeof SIZES;
}) {
  const initials = `${first[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
  return (
    <span
      className={`inline-flex flex-none items-center justify-center rounded-md border border-olive-200/60 bg-olive-100 font-medium text-olive-800 ${SIZES[size]}`}
    >
      {initials}
    </span>
  );
}
