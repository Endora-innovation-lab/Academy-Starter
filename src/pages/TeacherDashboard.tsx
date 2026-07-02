import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ClipboardList, DollarSign, Layers, Search, UserCheck, BarChart3, LayoutDashboard, User } from 'lucide-react';
import TeacherProfile from '@/components/profiles/TeacherProfile';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { SortableTH, useSort } from '@/components/SortableTable';

const TeacherDashboard = () => {
  const { user, instituteId, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [teacherRecord, setTeacherRecord] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data } = await supabase.from('teachers').select('*').eq('user_id', user.id).single();
      setTeacherRecord(data);
    };
    fetch();
  }, [user]);

  const tabs = [
    { label: 'Overview', value: 'overview', icon: LayoutDashboard },
    { label: 'Mark Attendance', value: 'attendance', icon: ClipboardList },
    { label: 'Update Fees', value: 'fees', icon: DollarSign },
    { label: 'Profile', value: 'profile', icon: User },
  ];

  if (loading || (user && !instituteId)) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading dashboard...</div>;
  }

  if (!user || !instituteId) {
    return <Navigate to="/" replace />;
  }

  return (
    <DashboardLayout title="Teacher Dashboard" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'overview' && teacherRecord && <OverviewTab teacherId={teacherRecord.id} instituteId={instituteId} />}
      {activeTab === 'attendance' && teacherRecord && (
        <div className="space-y-8">
          <MyAttendanceTab teacherId={teacherRecord.id} instituteId={instituteId} userId={user.id} />
          <MarkAttendanceTab teacherId={teacherRecord.id} instituteId={instituteId} userId={user.id} />
        </div>
      )}
      {activeTab === 'fees' && teacherRecord && <UpdateFeesTab teacherId={teacherRecord.id} instituteId={instituteId} userId={user.id} />}
      {activeTab === 'profile' && teacherRecord && <TeacherProfile teacherId={teacherRecord.id} />}
    </DashboardLayout>
  );
};

// ============= OVERVIEW TAB =============
const OverviewTab = ({ teacherId, instituteId }: { teacherId: string; instituteId: string }) => {
  const [counts, setCounts] = useState({ present: 0, absent: 0, late: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string; color: string }[]>([]);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const load = async () => {
      const firstDay = `${month}-01`;
      const [y, m] = month.split('-').map(Number);
      const lastDay = new Date(y, m, 0).toISOString().split('T')[0];
      const { data } = await supabase
        .from('teacher_attendance')
        .select('status, date, batch_id, batches(name)')
        .eq('teacher_id', teacherId)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .order('date', { ascending: true });
      const c = { present: 0, absent: 0, late: 0 };
      const batchMap: Record<string, string> = {};
      const palette = ['hsl(217 91% 60%)', 'hsl(280 80% 60%)', 'hsl(160 70% 45%)', 'hsl(35 95% 55%)', 'hsl(0 80% 60%)', 'hsl(190 85% 50%)', 'hsl(320 75% 60%)', 'hsl(50 90% 50%)'];
      const dateMap: Record<string, any> = {};
      (data || []).forEach((r: any) => {
        if (r.status === 'present') c.present++;
        else if (r.status === 'late') c.late++;
        else c.absent++;
        const bname = r.batches?.name || 'Batch';
        batchMap[r.batch_id] = bname;
        if (!dateMap[r.date]) dateMap[r.date] = { date: r.date.slice(8), fullDate: r.date };
        dateMap[r.date][r.batch_id] = r.status === 'present' ? 3 : r.status === 'late' ? 2 : 1;
      });
      setCounts(c);
      const bArr = Object.entries(batchMap).map(([id, name], i) => ({ id, name, color: palette[i % palette.length] }));
      setBatches(bArr);
      setChartData(Object.values(dateMap).sort((a: any, b: any) => a.fullDate.localeCompare(b.fullDate)));
    };
    load();
  }, [teacherId, month]);

  const total = counts.present + counts.absent + counts.late;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5" /> My Attendance Overview</h2>
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-48" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Days</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Present</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-accent">{counts.present}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Late</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-500">{counts.late}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Absent</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{counts.absent}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Attendance Trend (by batch)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No attendance records this month</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" interval={0} stroke="hsl(var(--muted-foreground))" label={{ value: 'Date', position: 'insideBottom', offset: -2, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    domain={[0, 3]}
                    ticks={[1, 2, 3]}
                    tickFormatter={(v: number) => (v === 3 ? 'P' : v === 2 ? 'L' : v === 1 ? 'A' : '')}
                    label={{ value: 'Status', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    labelFormatter={(label, payload) => (payload?.[0]?.payload as any)?.fullDate || label}
                    formatter={(v: any) => [v === 3 ? 'Present' : v === 2 ? 'Late' : v === 1 ? 'Absent' : '-', 'Status']}
                  />
                  <Legend />
                  {batches.map(b => (
                    <Line key={b.id} type="monotone" dataKey={b.id} name={b.name} stroke={b.color} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <TeacherBatchesTab teacherId={teacherId} instituteId={instituteId} />
    </div>
  );
};

// Helper: cycle unmarked → present → late → absent → unmarked
const cycleStatus = (current: string): string => {
  if (current === 'unmarked') return 'present';
  if (current === 'present') return 'late';
  if (current === 'late') return 'absent';
  return 'unmarked';
};

// Helper: render status as P/L/A/— badge
const StatusBadge = ({ status, onClick }: { status: string; onClick?: () => void }) => {
  const label = status === 'present' ? 'P' : status === 'late' ? 'L' : status === 'absent' ? 'A' : '—';
  const cls =
    status === 'present'
      ? 'bg-accent text-accent-foreground'
      : status === 'late'
        ? 'bg-yellow-500 text-white'
        : status === 'absent'
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-muted text-muted-foreground';
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`px-3 py-1 rounded text-xs font-bold w-10 transition-colors ${cls}`}
        title={status.charAt(0).toUpperCase() + status.slice(1)}
      >
        {label}
      </button>
    );
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold inline-block w-8 text-center ${cls}`}>
      {label}
    </span>
  );
};

const TeacherBatchesTab = ({ teacherId, instituteId }: { teacherId: string; instituteId: string }) => {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetch = async () => {
      const [{ data: btData }, { data: legacyData }] = await Promise.all([
        supabase.from('batch_teachers').select('batch_id').eq('teacher_id', teacherId),
        supabase.from('batches').select('id').eq('teacher_id', teacherId),
      ]);
      const batchIds = new Set([
        ...(btData?.map(bt => bt.batch_id) || []),
        ...(legacyData?.map(b => b.id) || []),
      ]);
      if (batchIds.size > 0) {
        const { data } = await supabase.from('batches').select('*').in('id', Array.from(batchIds));
        setBatches(data || []);
      }
    };
    fetch();
  }, [teacherId]);

  const viewStudents = async (batchId: string) => {
    setSelectedBatch(batchId);
    const { data } = await supabase
      .from('batch_students')
      .select('*, students(reg_no, parent_phone, profiles!students_user_id_profiles_fkey(name))')
      .eq('batch_id', batchId);
    setStudents(data || []);
  };

  const filteredStudents = searchTerm
    ? students.filter(s => {
        const name = (s.students as any)?.profiles?.name?.toLowerCase() || '';
        return name.includes(searchTerm.toLowerCase());
      })
    : students;

  const { sorted: displayStudents, sortKey, sortDir, toggle } = useSort(filteredStudents, {
    name: (s: any) => (s.students as any)?.profiles?.name || '',
    reg_no: (s: any) => (s.students as any)?.reg_no || '',
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2"><Layers className="h-5 w-5" /> My Batches</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {batches.map(b => (
          <Card key={b.id} className={selectedBatch === b.id ? 'ring-2 ring-primary' : ''}>
            <CardHeader className="pb-2"><CardTitle className="text-base">{b.name}</CardTitle></CardHeader>
            <CardContent>
              <Button size="sm" variant="outline" onClick={() => viewStudents(b.id)}>View Students</Button>
            </CardContent>
          </Card>
        ))}
        {batches.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-8">No batches assigned</p>}
      </div>

      {selectedBatch && (
        <>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search student name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">S.No</th>
                  <SortableTH sortKey="name" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Name</SortableTH>
                  <SortableTH sortKey="reg_no" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Reg No</SortableTH>
                </tr>
              </thead>
              <tbody>
                {displayStudents.map((s, index) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3">{index + 1}</td>
                    <td className="p-3">{(s.students as any)?.profiles?.name}</td>
                    <td className="p-3">{(s.students as any)?.reg_no}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

// ============= TEACHER SELF-ATTENDANCE TAB =============
const MyAttendanceTab = ({ teacherId, instituteId, userId }: { teacherId: string; instituteId: string; userId: string }) => {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<string>('absent');
  const [history, setHistory] = useState<any[]>([]);
  const [historyMonth, setHistoryMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Load assigned batches
  useEffect(() => {
    const fetch = async () => {
      const [{ data: btData }, { data: legacyData }] = await Promise.all([
        supabase.from('batch_teachers').select('batch_id').eq('teacher_id', teacherId),
        supabase.from('batches').select('id').eq('teacher_id', teacherId),
      ]);
      const batchIds = new Set([
        ...(btData?.map(bt => bt.batch_id) || []),
        ...(legacyData?.map(b => b.id) || []),
      ]);
      if (batchIds.size > 0) {
        const { data } = await supabase.from('batches').select('*').in('id', Array.from(batchIds));
        setBatches(data || []);
      }
    };
    fetch();
  }, [teacherId]);

  // Load existing status for selected batch + date
  useEffect(() => {
    const load = async () => {
      if (!selectedBatch || !date) return;
      const { data } = await supabase
        .from('teacher_attendance')
        .select('status')
        .eq('teacher_id', teacherId)
        .eq('batch_id', selectedBatch)
        .eq('date', date)
        .maybeSingle();
      setStatus(data?.status || 'absent');
    };
    load();
  }, [teacherId, selectedBatch, date]);

  // Load history for selected month
  const fetchHistory = async () => {
    const firstDay = `${historyMonth}-01`;
    const [year, month] = historyMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).toISOString().split('T')[0];

    const { data } = await supabase
      .from('teacher_attendance')
      .select('*, batches(name)')
      .eq('teacher_id', teacherId)
      .gte('date', firstDay)
      .lte('date', lastDay)
      .order('date', { ascending: false });
    setHistory(data || []);
  };

  useEffect(() => { fetchHistory(); }, [teacherId, historyMonth]);

  const { sorted: sortedHistory, sortKey: hSortKey, sortDir: hSortDir, toggle: hToggle } = useSort(history, {
    date: (h: any) => h.date || '',
    batch: (h: any) => (h.batches as any)?.name || '',
    status: (h: any) => h.status || '',
  });

  const handleSave = async () => {
    if (!selectedBatch) {
      toast.error('Please select a batch first');
      return;
    }
    try {
      const { error } = await supabase.from('teacher_attendance').upsert(
        {
          teacher_id: teacherId,
          batch_id: selectedBatch,
          date,
          status,
          marked_by: userId,
          institute_id: instituteId,
        },
        { onConflict: 'teacher_id,batch_id,date' },
      );
      if (error) throw error;
      toast.success('Your attendance saved!');
      fetchHistory();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><UserCheck className="h-5 w-5" /> My Attendance</h2>
        <p className="text-sm text-muted-foreground mt-1">Mark your own presence for each batch you teach. Tap the badge to cycle: Absent → Present → Late.</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Mark for today</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select batch" /></SelectTrigger>
              <SelectContent>
                {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-48" />
          </div>

          {selectedBatch && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Status:</span>
              <StatusBadge status={status} onClick={() => setStatus(cycleStatus(status))} />
              <span className="text-xs text-muted-foreground">A = Absent · P = Present · L = Late</span>
            </div>
          )}

          {selectedBatch && <Button onClick={handleSave}>Save Attendance</Button>}
        </CardContent>
      </Card>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="font-semibold">My History</h3>
          <Input type="month" value={historyMonth} onChange={e => setHistoryMonth(e.target.value)} className="w-48" />
        </div>
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">S.No</th>
                <SortableTH sortKey="date" currentKey={hSortKey} dir={hSortDir} onToggle={hToggle}>Date</SortableTH>
                <SortableTH sortKey="batch" currentKey={hSortKey} dir={hSortDir} onToggle={hToggle}>Batch</SortableTH>
                <SortableTH sortKey="status" currentKey={hSortKey} dir={hSortDir} onToggle={hToggle}>Status</SortableTH>
              </tr>
            </thead>
            <tbody>
              {sortedHistory.map((h, index) => (
                <tr key={h.id} className="border-t">
                  <td className="p-3">{index + 1}</td>
                  <td className="p-3">{h.date}</td>
                  <td className="p-3">{(h.batches as any)?.name || '-'}</td>
                  <td className="p-3"><StatusBadge status={h.status} /></td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No attendance records this month</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MarkAttendanceTab = ({ teacherId, instituteId, userId }: { teacherId: string; instituteId: string; userId: string }) => {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [existingIds, setExistingIds] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: btData }, { data: legacyData }] = await Promise.all([
        supabase.from('batch_teachers').select('batch_id').eq('teacher_id', teacherId),
        supabase.from('batches').select('id').eq('teacher_id', teacherId),
      ]);
      const batchIds = new Set([
        ...(btData?.map(bt => bt.batch_id) || []),
        ...(legacyData?.map(b => b.id) || []),
      ]);
      if (batchIds.size > 0) {
        const { data } = await supabase.from('batches').select('*').in('id', Array.from(batchIds));
        setBatches(data || []);
      }
    };
    fetch();
  }, [teacherId]);

  const loadStudents = async () => {
    if (!selectedBatch) return;
    const { data } = await supabase
      .from('batch_students')
      .select('student_id, students(id, reg_no, status, parent_phone, profiles!students_user_id_profiles_fkey(name))')
      .eq('batch_id', selectedBatch);

    const studs = (data || []).filter((s: any) => (s.students as any)?.status !== 'inactive');
    setStudents(studs);

    const studentIds = studs.map(s => s.student_id);
    const map: Record<string, string> = {};
    const existing: Record<string, boolean> = {};

    if (studentIds.length > 0) {
      const { data: att } = await supabase
        .from('attendance')
        .select('student_id, status')
        .in('student_id', studentIds)
        .eq('batch_id', selectedBatch)
        .eq('date', date);

      att?.forEach(a => { map[a.student_id] = a.status; existing[a.student_id] = true; });
    }

    // UI default: show ABSENT for every student. Do NOT save automatically —
    // only records the teacher explicitly touched (or that already exist) are saved.
    studentIds.forEach(id => { if (!map[id]) map[id] = 'absent'; });
    setAttendanceMap(map);
    setExistingIds(existing);
    setTouched({});
    setHasLoaded(true);
  };

  useEffect(() => { setHasLoaded(false); loadStudents(); }, [selectedBatch, date]);

  const toggleAttendance = (studentId: string) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: cycleStatus(prev[studentId] || 'absent'),
    }));
    setTouched(prev => ({ ...prev, [studentId]: true }));
  };

  const saveAttendance = async () => {
    try {
      const records = Object.entries(attendanceMap)
        .filter(([sid, status]) => status !== 'unmarked' && (touched[sid] || existingIds[sid]))
        .map(([student_id, status]) => ({
          student_id,
          batch_id: selectedBatch,
          date,
          status,
          marked_by: userId,
          institute_id: instituteId,
        }));
      if (records.length === 0) {
        toast.error('No attendance changes to save.');
        return;
      }
      const { error } = await supabase.from('attendance').upsert(records, {
        onConflict: 'student_id,batch_id,date',
      });
      if (error) throw error;
      toast.success('Attendance saved!');
      setTouched({});
    } catch (err: any) {
      toast.error(err.message);
    }
  };


  const filteredStudents = searchTerm
    ? students.filter(s => {
        const name = (s.students as any)?.profiles?.name?.toLowerCase() || '';
        return name.includes(searchTerm.toLowerCase());
      })
    : students;

  const { sorted: displayStudents, sortKey, sortDir, toggle } = useSort(filteredStudents, {
    name: (s: any) => (s.students as any)?.profiles?.name || '',
    reg_no: (s: any) => (s.students as any)?.reg_no || '',
    status: (s: any) => attendanceMap[s.student_id] || 'unmarked',
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Mark Student Attendance</h2>
      <p className="text-sm text-muted-foreground">Tap the badge to cycle: — (unmarked) → P → L → A → —. Past dates with no record show —.</p>
      <div className="flex flex-wrap gap-3">
        <Select value={selectedBatch} onValueChange={setSelectedBatch}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Select batch" /></SelectTrigger>
          <SelectContent>
            {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-48" />
        {students.length > 0 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-48" placeholder="Search student..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        )}
      </div>

      {hasLoaded && displayStudents.length > 0 && (
        <>
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">S.No</th>
                  <SortableTH sortKey="name" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Name</SortableTH>
                  <SortableTH sortKey="reg_no" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Reg No</SortableTH>
                  <th className="text-left p-3 font-medium">Contact</th>
                  <SortableTH sortKey="status" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Status</SortableTH>
                </tr>
              </thead>
              <tbody>
                {displayStudents.map((s, index) => {
                  const student = s.students as any;
                  const phone = student?.parent_phone;
                  return (
                    <tr key={s.student_id} className="border-t">
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3">{student?.profiles?.name}</td>
                      <td className="p-3">{student?.reg_no}</td>
                      <td className="p-3">{phone ? <a href={`tel:${phone}`} className="text-primary hover:underline">{phone}</a> : '-'}</td>
                      <td className="p-3">
                        <StatusBadge
                          status={attendanceMap[s.student_id] || 'absent'}
                          onClick={() => toggleAttendance(s.student_id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Button onClick={saveAttendance}>Save Attendance</Button>
        </>
      )}
    </div>
  );
};

const UpdateFeesTab = ({ teacherId, instituteId, userId }: { teacherId: string; instituteId: string; userId: string }) => {
  const [batches, setBatches] = useState<any[]>([]); // {id, name, game_id}
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [month, setMonth] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load batches assigned to this teacher (both via batch_teachers and legacy batches.teacher_id)
  useEffect(() => {
    const fetch = async () => {
      const [{ data: btData }, { data: legacyData }] = await Promise.all([
        supabase.from('batch_teachers').select('batch_id').eq('teacher_id', teacherId),
        supabase.from('batches').select('id').eq('teacher_id', teacherId),
      ]);
      const batchIds = Array.from(new Set([
        ...(btData?.map(bt => bt.batch_id) || []),
        ...(legacyData?.map(b => b.id) || []),
      ]));
      if (batchIds.length === 0) { setBatches([]); return; }
      const { data: bs } = await supabase.from('batches').select('id, name, game_id').in('id', batchIds).order('name');
      setBatches(bs || []);
      if ((bs || []).length === 1) setSelectedBatch(bs![0].id);
    };
    fetch();
  }, [teacherId]);

  const currentBatch = batches.find(b => b.id === selectedBatch);
  const gameId = currentBatch?.game_id || null;

  const load = async () => {
    if (!selectedBatch || !month) return;
    // Students in this batch
    const { data: bsRows } = await supabase
      .from('batch_students')
      .select('student_id, students(id, reg_no, status, profiles!students_user_id_profiles_fkey(name))')
      .eq('batch_id', selectedBatch);
    const active = (bsRows || []).filter((r: any) => (r.students as any)?.status !== 'inactive');
    const studentIds = active.map((r: any) => r.student_id);

    // Per-game enrollment status & monthly fee (filter out students not actively enrolled in this batch's game)
    let sgMap: Record<string, any> = {};
    if (gameId && studentIds.length > 0) {
      const { data: sgRows } = await supabase
        .from('student_games')
        .select('student_id, monthly_fee, status')
        .eq('game_id', gameId)
        .in('student_id', studentIds);
      (sgRows || []).forEach((s: any) => { sgMap[s.student_id] = s; });
    }

    const eligible = active.filter((r: any) => !gameId || (sgMap[r.student_id] && sgMap[r.student_id].status === 'active'));
    const eligibleIds = eligible.map((r: any) => r.student_id);

    const feeMap: Record<string, any> = {};
    if (eligibleIds.length > 0 && gameId) {
      const { data: fees } = await supabase
        .from('fees')
        .select('*')
        .in('student_id', eligibleIds)
        .eq('game_id', gameId)
        .eq('month', month);
      (fees || []).forEach((f: any) => { feeMap[f.student_id] = f; });
    }

    const built = eligible.map((r: any) => {
      const stu = r.students as any;
      const sg = sgMap[r.student_id];
      const fee = feeMap[r.student_id];
      return {
        student_id: r.student_id,
        name: stu?.profiles?.name || '—',
        reg_no: stu?.reg_no || '',
        monthly_fee: Number(fee?.amount ?? sg?.monthly_fee ?? 0) || 0,
        fee_id: fee?.id || null,
        collected: Number(fee?.collected_amount) || 0,
        mode: fee?.payment_mode || '',
        notes: fee?.notes || '',
      };
    });
    setRows(built);
    setDirty({});
    setHasLoaded(true);
  };

  useEffect(() => { setHasLoaded(false); load(); }, [selectedBatch, month]);

  const markDirty = (sid: string) => setDirty(prev => ({ ...prev, [sid]: true }));

  const updateRow = (sid: string, patch: Partial<any>) => {
    setRows(prev => prev.map(r => r.student_id === sid ? { ...r, ...patch } : r));
    markDirty(sid);
  };

  const saveFees = async () => {
    const changedIds = Object.keys(dirty).filter(id => dirty[id]);
    if (changedIds.length === 0) { toast.info('No changes to save'); return; }
    setSaving(true);
    try {
      for (const sid of changedIds) {
        const r = rows.find(x => x.student_id === sid);
        if (!r) continue;
        const amt = Number(r.monthly_fee) || 0;
        const col = Number(r.collected) || 0;
        const status = col === 0 ? 'unpaid' : col >= amt ? 'paid' : 'partial';
        const excess = Math.max(0, col - amt);
        const payload: any = {
          amount: amt,
          collected_amount: col,
          excess_amount: excess,
          status,
          payment_mode: r.mode || null,
          notes: r.notes || null,
          updated_by: userId,
          game_id: gameId,
        };
        let savedId = r.fee_id;
        if (r.fee_id) {
          const { error } = await supabase.from('fees').update(payload).eq('id', r.fee_id);
          if (error) throw error;
        } else {
          const { data: ins, error } = await supabase.from('fees').insert({
            ...payload, student_id: sid, month, institute_id: instituteId,
          }).select('id').single();
          if (error) throw error;
          savedId = ins?.id;
        }
        await supabase.from('fee_history').insert({
          fee_id: savedId, student_id: sid, institute_id: instituteId, month,
          amount: amt, collected_amount: col, excess_amount: excess, status,
          payment_mode: r.mode || null, notes: r.notes || null, game_id: gameId,
          updated_by: userId, updated_by_role: 'teacher',
        });
      }
      toast.success(`${changedIds.length} fee record(s) saved`);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const filtered = searchTerm
    ? rows.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : rows;

  const { sorted: displayRows, sortKey, sortDir, toggle } = useSort(filtered, {
    name: (r: any) => r.name || '',
    reg_no: (r: any) => r.reg_no || '',
    fee: (r: any) => Number(r.monthly_fee) || 0,
    collected: (r: any) => Number(r.collected) || 0,
  });

  const statusClass = (s: string) => s === 'paid' ? 'bg-accent/10 text-accent'
    : s === 'partial' ? 'bg-yellow-500/10 text-yellow-600'
    : 'bg-destructive/10 text-destructive';

  const dirtyCount = Object.values(dirty).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2"><DollarSign className="h-5 w-5" /> Update Fees</h2>
      <p className="text-sm text-muted-foreground">Enter Collected Amount and Payment Mode. Monthly Fee is set by the institute. Status is calculated automatically. Click <b>Save Fees</b> to apply.</p>
      <div className="flex flex-wrap gap-3">
        {batches.length > 1 && (
          <Select value={selectedBatch} onValueChange={setSelectedBatch}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select batch" /></SelectTrigger>
            <SelectContent>
              {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-48" />
        {rows.length > 0 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-48" placeholder="Search student..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        )}
      </div>

      {hasLoaded && selectedBatch && month && displayRows.length > 0 && (
        <>
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">S.No</th>
                  <SortableTH sortKey="name" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Name</SortableTH>
                  <SortableTH sortKey="reg_no" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Reg No</SortableTH>
                  <SortableTH sortKey="fee" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Monthly Fee (₹)</SortableTH>
                  <SortableTH sortKey="collected" currentKey={sortKey} dir={sortDir} onToggle={toggle}>Collected (₹)</SortableTH>
                  <th className="text-left p-3 font-medium">Balance (₹)</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Mode</th>
                  <th className="text-left p-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((r, index) => {
                  const amt = Number(r.monthly_fee) || 0;
                  const col = Number(r.collected) || 0;
                  const due = Math.max(0, amt - col);
                  const excess = Math.max(0, col - amt);
                  const st = col === 0 ? 'unpaid' : col >= amt ? 'paid' : 'partial';
                  return (
                    <tr key={r.student_id} className={`border-t ${dirty[r.student_id] ? 'bg-yellow-50/40' : ''}`}>
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3">{r.name}</td>
                      <td className="p-3">{r.reg_no}</td>
                      <td className="p-3 font-medium">₹{amt.toLocaleString()}</td>
                      <td className="p-3">
                        <Input type="number" min="0" className="w-24" value={r.collected}
                          onChange={e => updateRow(r.student_id, { collected: Number(e.target.value) || 0 })}
                          placeholder="0" />
                        {excess > 0 && <p className="text-xs text-accent mt-1">+₹{excess} excess</p>}
                      </td>
                      <td className="p-3 font-medium">₹{due.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusClass(st)}`}>{st}</span>
                      </td>
                      <td className="p-3">
                        <Select value={r.mode || 'none'}
                          onValueChange={v => updateRow(r.student_id, { mode: v === 'none' ? '' : v })}>
                          <SelectTrigger className="w-28 h-8"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <Input className="w-40" value={r.notes || ''}
                          onChange={e => updateRow(r.student_id, { notes: e.target.value })}
                          placeholder="Optional note" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={saveFees} disabled={saving || dirtyCount === 0}>
              {saving ? 'Saving...' : `Save Fees${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
            </Button>
            {dirtyCount > 0 && <span className="text-xs text-muted-foreground">Unsaved changes — click Save to apply.</span>}
          </div>
        </>
      )}
      {hasLoaded && selectedBatch && month && displayRows.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No active students in this batch enrolled for the linked game.</p>
      )}
    </div>
  );
};

export default TeacherDashboard;
