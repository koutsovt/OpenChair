import { cn } from '@/lib/utils';

type ProductChipProps = {
  brand: string;
  name: string;
  shadeCode?: string | null;
  className?: string;
};

export function ProductChip({ brand, name, shadeCode, className }: ProductChipProps) {
  return (
    <span className={cn('text-sm', className)}>
      <span className="font-medium">{brand}</span>
      {' — '}
      {name}
      {shadeCode && (
        <span className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{shadeCode}</span>
      )}
    </span>
  );
}
