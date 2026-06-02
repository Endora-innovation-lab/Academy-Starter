import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, DollarSign } from 'lucide-react';
import { SortableTH, useSort } from '@/components/SortableTable';

const StudentDashboard = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance');
  const [studentRecord, setStudentRecord] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data } = await supabase.from('students').select('*').eq('user_id', user.id).single();
      setStudentRecord(data);
    };
    fetch();
  }, [user]);

  const tabs = [
    { label: 'Attendance', value: 'attendance' },
    { label: 'Fees', value: 'fees' },
  ];

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading dashboard...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <DashboardLayout title="Student Dashboard" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'attendance' && studentRecord && <StudentAttendanceTab studentId={studentRecord.id} />}
      {activeTab === 'fees' && studentRecord && <StudentFeesTab studentId={studentRecord.id} />}
    </DashboardLayout>
  );
};

const getMonthOptions = () => {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    options.push({ value: val, label });
  }
  return options;
};

const StudentAttendanceTab = ({ studentId }: { studentId: string }) => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [filterBatch, setFilterBatch] = useState('all');
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const monthOptions = getMonthOptions();

  useEffect(() => {
    const fetchBatches = async () => {
      const { data: bsData } = await supabase.from('batch_students').select('batch_id, batches(id, name)').eq('student_id', studentId);
      const uniqueBatches = bsData?.map(bs => (bs.batches as any)).filter(Boolean) || [];
      setBatches(uniqueBatches);
    };
    fetchBatches();
  }, [studentId]);

  useEffect(() => {
    const fetch = async () => {
      const firstDay = `${filterMonth}-01`;
      const [year, month] = filterMonth.split('-').map(Number);
      const lastDay = new Date(year, month, 0).toISOString().split('T')[0];

      let query = supabase
        .from('attendance')
        .select('*, batches(name)')
        .eq('student_id', studentId)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .order('date', { ascending: false });

      if (filterBatch !== 'all') {
        query = query.eq('batch_id', filterBatch);
      }

      const { data } = await query;
      setAttendance(data || []);
    };
    fetch();
  }, [studentId, filterMonth, filterBatch]);

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const lateCount = attendance.filter(a => a.status === 'late').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;
  const totalCount = attendance.length;

  const { sorted: sortedAttendance, sortKey, sortDir, toggle } = useSort(attendance, {
    date: (a: any) => a.date || '',
    batch: (a: any) => (a.batches as any)?.name || '',
    status: (a: any) => a.status || '',
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5" /> My Attendance</h2>
        <div className="flex gap-2">
          <Select value={filterBatch} onValueChange={setFilterBatch}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Filter by batch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {totalCount > 0 && (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="px-3 py-1 rounded bg-accent/10 text-accent font-medium">Present (P): {presentCount}</span>
          <span className="px-3 py-1 rounded bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 font-medium">Late (L): {lateCount}</span>
          <span className="px-3 py-1 rounded bg-destructive/10 text-destructive font-medium">Absent (A): {absentCount}</span>
          <span className="px-3 py-1 rounded bg-muted font-medium">Total: {totalCount}</span>
        </div>
      )}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">S.No</th>
              <SortableTH sortKey="date" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Date</SortableTH>
              <SortableTH sortKey="batch" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Batch</SortableTH>
              <SortableTH sortKey="status" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Status</SortableTH>
            </tr>
          </thead>
          <tbody>
            {sortedAttendance.map((a, index) => (
              <tr key={a.id} className="border-t">
                <td className="p-3">{index + 1}</td>
                <td className="p-3">{a.date}</td>
                <td className="p-3">{(a.batches as any)?.name || '-'}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold inline-block w-8 text-center ${
                    a.status === 'present'
                      ? 'bg-accent/10 text-accent'
                      : a.status === 'late'
                        ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-500'
                        : 'bg-destructive/10 text-destructive'
                  }`}>{a.status === 'present' ? 'P' : a.status === 'late' ? 'L' : 'A'}</span>
                </td>
              </tr>
            ))}
            {attendance.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No attendance records for this month</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StudentFeesTab = ({ studentId }: { studentId: string }) => {
  const [fees, setFees] = useState<any[]>([]);
  const [filterMonth, setFilterMonth] = useState('all');
  const monthOptions = getMonthOptions();

  useEffect(() => {
    const fetch = async () => {
      let query = supabase.from('fees').select('*').eq('student_id', studentId).order('month', { ascending: false });
      if (filterMonth !== 'all') query = query.eq('month', filterMonth);
      const { data } = await query;
      setFees(data || []);
    };
    fetch();
  }, [studentId, filterMonth]);

  const { sorted: sortedFees, sortKey, sortDir, toggle } = useSort(fees, {
    month: (f: any) => f.month || '',
    amount: (f: any) => Number(f.amount) || 0,
    collected: (f: any) => Number(f.collected_amount) || 0,
    status: (f: any) => f.status || '',
  });

  const totals = fees.reduce((acc, f) => {
    const amt = Number(f.amount) || 0;
    const col = Number(f.collected_amount) || 0;
    acc.total += amt;
    acc.paid += col;
    acc.due += Math.max(0, amt - col);
    return acc;
  }, { total: 0, paid: 0, due: 0 });

  const statusCls = (s: string) => s === 'paid' ? 'bg-accent/10 text-accent'
    : s === 'partial' ? 'bg-yellow-500/10 text-yellow-600'
    : 'bg-destructive/10 text-destructive';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2"><DollarSign className="h-5 w-5" /> My Fees</h2>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Fee</p>
          <p className="text-2xl font-bold">₹{totals.total.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Paid</p>
          <p className="text-2xl font-bold text-accent">₹{totals.paid.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Due</p>
          <p className="text-2xl font-bold text-destructive">₹{totals.due.toLocaleString()}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">S.No</th>
              <SortableTH sortKey="month" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Month</SortableTH>
              <SortableTH sortKey="amount" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Total (₹)</SortableTH>
              <SortableTH sortKey="collected" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Paid (₹)</SortableTH>
              <th className="text-left p-3 font-medium">Due (₹)</th>
              <SortableTH sortKey="status" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Status</SortableTH>
              <th className="text-left p-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {sortedFees.map((f, index) => {
              const amt = Number(f.amount) || 0;
              const col = Number(f.collected_amount) || 0;
              const due = Math.max(0, amt - col);
              return (
                <tr key={f.id} className="border-t">
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3">{f.month}</td>
                  <td className="p-3">₹{amt.toLocaleString()}</td>
                  <td className="p-3">₹{col.toLocaleString()}</td>
                  <td className="p-3 font-medium">₹{due.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusCls(f.status)}`}>{f.status}</span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate" title={f.notes || ''}>{f.notes || '—'}</td>
                </tr>
              );
            })}
            {fees.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No fee records</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentDashboard;
