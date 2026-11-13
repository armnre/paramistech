import { cn } from '@project/components/lib/utils';
import { statusTone } from '../lib/format';

export function StatusBadge({ s, className }: { s?: string | null; className?: string }) {
  if (!s) return <span className="text-muted-foreground">—</span>;
  return <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset', statusTone[s] ?? 'bg-muted text-muted-foreground ring-border', className)}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{s}</span>;
}
