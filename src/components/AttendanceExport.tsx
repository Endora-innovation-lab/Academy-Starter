import { useState } from 'react';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

export type ExportData = { headers: string[]; rows: (string | number)[][] };

interface Props {
  filename: string;
  /** Returns only the currently visible/filtered data, or null when nothing is exportable. */
  getData: () => ExportData | null;
  disabled?: boolean;
}

export const AttendanceExportButton = ({ filename, getData, disabled }: Props) => {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const runExport = async () => {
    if (!password) { toast.error('Enter your password'); return; }
    setBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user?.email;
      if (!email) { toast.error('Session expired. Please log in again.'); return; }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error('Incorrect password'); return; }

      const data = getData();
      if (!data || data.rows.length === 0) { toast.error('No data to export'); return; }

      const sheet = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
      if (format === 'csv') {
        const csv = XLSX.utils.sheet_to_csv(sheet);
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        const a = document.createElement('a');
        a.href = url; a.download = `${filename}.csv`; a.click();
        URL.revokeObjectURL(url);
      } else {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, sheet, 'Attendance');
        XLSX.writeFile(wb, `${filename}.xlsx`);
      }
      toast.success('Export downloaded');
      setOpen(false);
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="gap-1"
      >
        <Download className="h-4 w-4" /> Download
      </Button>

      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setPassword(''); }}>
        <DialogContent className="w-[92vw] max-w-sm rounded-lg">
          <DialogHeader>
            <DialogTitle>Download Attendance</DialogTitle>
            <DialogDescription>
              Exports only the currently filtered data shown on screen. Confirm your login password to continue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Format</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={format === 'xlsx' ? 'default' : 'outline'}
                  onClick={() => setFormat('xlsx')}
                >Excel (.xlsx)</Button>
                <Button
                  type="button"
                  variant={format === 'csv' ? 'default' : 'outline'}
                  onClick={() => setFormat('csv')}
                >CSV</Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="export-password">Password</Label>
              <Input
                id="export-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !busy) runExport(); }}
                placeholder="Enter your login password"
              />
            </div>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={runExport} disabled={busy}>{busy ? 'Verifying...' : 'Verify & Download'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
