/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, type ReactNode } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { ConfirmDelete, DataTable, PageHead, RecordDialog, type Col, type Field } from './kit';
import { errMsg, useApi, useList, type Table } from './session';

export function CrudPage({ table, title, desc, label, cols, fields, searchKeys, tabs, tabKey, defaults = {}, filters, onRow, extraActions, toForm, canCreate = true }: {
  table: Table; title: string; desc?: string; label: string; cols: Col[]; fields: Field[]; searchKeys: string[]; tabs?: string[]; tabKey?: string;
  defaults?: Record<string, any>; filters?: Record<string, unknown>; onRow?: (r: any) => void; extraActions?: ReactNode; toForm?: (r: any) => Record<string, any>; canCreate?: boolean;
}) {
  const api = useApi();
  const { rows, setRows, reload } = useList(table, filters);
  const [edit, setEdit] = useState<Record<string, any> | null>(null);
  const [del, setDel] = useState<any>(null);
  const linkKeys = fields.filter((f) => f.type === 'link').map((f) => f.key);
  const norm = (r: any) => { const x = { ...(toForm ? toForm(r) : r) }; linkKeys.forEach((k) => { if (Array.isArray(x[k])) x[k] = x[k][0]; }); return x; };

  const actions: Col = {
    key: '_a', label: '', className: 'w-24', render: (r) => (
      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEdit(norm(r))}><Pencil className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDel(r)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    ),
  };

  return (
    <>
      <PageHead title={title} desc={desc} actions={<>{extraActions}{canCreate && <Button className="h-10 rounded-xl font-bold" onClick={() => setEdit({ ...defaults })}><Plus className="h-4 w-4" />{label} جدید</Button>}</>} />
      <DataTable rows={rows} cols={[...cols, actions]} searchKeys={searchKeys} tabs={tabs} tabKey={tabKey} onRow={onRow ?? ((r) => setEdit(norm(r)))} />
      <RecordDialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)} title={edit?.id ? `ویرایش ${label}` : `${label} جدید`} fields={fields} initial={edit ?? {}}
        onSubmit={async (d) => { const { id, ...rest } = d; Object.keys(rest).forEach((k) => { if (!fields.some((f) => f.key === k)) delete rest[k]; }); await api.save(table, rest, id); await reload(); }} />
      <ConfirmDelete open={!!del} onOpenChange={(o) => !o && setDel(null)} what={label}
        onConfirm={async () => { const r = del; setDel(null); setRows((x) => x?.filter((y) => y.id !== r.id) ?? null); try { await api.remove(table, r.id); toast.success('حذف شد'); } catch (e) { toast.error(errMsg(e)); reload(); } }} />
    </>
  );
}
