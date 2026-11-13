import { useState } from 'react';
import { toast } from 'sonner';
import { adminAuth } from 'zitejs/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Button } from '@project/components/ui/button';
import { errMsg, useAdmin } from './session';

export default function ChangePassword({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { token } = useAdmin();
  const [f, setF] = useState({ cur: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.next !== f.confirm) return toast.error('تکرار رمز جدید یکسان نیست');
    setBusy(true);
    try { await adminAuth({ action: 'changePassword', token, password: f.cur, newPassword: f.next }); toast.success('رمز عبور تغییر کرد'); setF({ cur: '', next: '', confirm: '' }); onOpenChange(false); }
    catch (er) { toast.error(errMsg(er)); } finally { setBusy(false); }
  };
  const field = (k: keyof typeof f, l: string) => <div><Label>{l}</Label><Input type="password" dir="ltr" className="mt-2 h-11 rounded-xl" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} required /></div>;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-sm rounded-3xl">
        <DialogHeader><DialogTitle className="text-right font-black">تغییر رمز عبور</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {field('cur', 'رمز فعلی')}{field('next', 'رمز جدید (حداقل ۸ کاراکتر)')}{field('confirm', 'تکرار رمز جدید')}
          <Button disabled={busy} className="h-11 w-full rounded-xl font-bold">ذخیره</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
