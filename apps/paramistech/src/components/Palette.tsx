import { useEffect } from 'react';
import { Command } from 'cmdk';
import { Dialog, DialogContent, DialogTitle } from '@project/components/ui/dialog';
import { Search, CornerDownLeft } from 'lucide-react';
import { nav, scrollTo } from '../data';

export default function Palette({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(!open); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, setOpen]);
  const go = (id: string) => { setOpen(false); setTimeout(() => scrollTo(id), 150); };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0" dir="rtl">
        <DialogTitle className="sr-only">جست‌وجو</DialogTitle>
        <Command className="bg-popover">
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Command.Input placeholder="کجا برویم؟" className="h-12 flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
          </div>
          <Command.List className="max-h-80 p-2">
            <Command.Empty className="p-6 text-center text-sm text-muted-foreground">نتیجه‌ای پیدا نشد.</Command.Empty>
            {nav.map((n) => (
              <Command.Item key={n.id} value={n.label} onSelect={() => go(n.id)} className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-3 text-sm data-[selected=true]:bg-primary/15">
                {n.label}<CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
