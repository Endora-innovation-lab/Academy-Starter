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
import { ClipboardList, DollarSign, Layers, Search, UserCheck } from 'lucide-react';

const TeacherDashboard = () => {
  const { user, instituteId, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('batches');
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
    { label: 'My Batches', value: 'batches' },
    { label: 'My Attendance', value: 'my-attendance' },
    { label: 'Mark Attendance', value: 'attendance' },
    { label: 'Update Fees', value: 'fees' },
  ];

  if (loading || (user && !instituteId)) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading dashboard...</div>;
  }

  if (!user || !instituteId) {
    return <Navigate to="/login/teacher" replace />;
  }

  return (
    <DashboardLayout title="Teacher Dashboard" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'batches' && teacherRecord && <TeacherBatchesTab teacherId={teacherRecord.id} instituteId={instituteId} />}
      {activeTab === 'my-attendance' && teacherRecord && <MyAttendanceTab teacherId={teacherRecord.id} instituteId={instituteId} userId={user.id} />}
      {activeTab === 'attendance' && teacherRecord && <MarkAttendanceTab teacherId={teacherRecord.id} instituteId={instituteId} userId={user.id} />}
      {activeTab === 'fees' && teacherRecord && <UpdateFeesTab teacherId={teacherRecord.id} instituteId={instituteId} userId={user.id} />}
    </DashboardLayout>
  );
};

// Helper: cycle absent → present → late → absent
const cycleStatus = (current: string): string => {
  if (current === 'absent') return 'present';
  if (current === 'present') return 'late';
  return 'absent';
};

// Helper: render status as P/L/A badge
const StatusBadge = ({ status, onClick }: { status: string; onClick?: () => void }) => {
  const label = status === 'present' ? 'P' : status === 'late' ? 'L' : 'A';
  const cls =
    status === 'present'
      ? 'bg-accent text-accent-foreground'
      : status === 'late'
        ? 'bg-yellow-500 text-white'
        : 'bg-destructive text-destructive-foreground';
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
      .select('*, students(reg_no, profiles!students_user_id_profiles_fkey(name))')
      .eq('batch_id', batchId);
    setStudents(data || []);
  };

  const displayStudents = searchTerm
    ? students.filter(s => {
        const name = (s.students as any)?.profiles?.name?.toLowerCase() || '';
        return name.includes(searchTerm.toLowerCase());
      })
    : students;

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
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Reg No</th>
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
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Batch</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, index) => (
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
      .select('student_id, students(id, reg_no, profiles!students_user_id_profiles_fkey(name))')
      .eq('batch_id', selectedBatch);

    const studs = data || [];
    setStudents(studs);

    const studentIds = studs.map(s => s.student_id);
    const map: Record<string, string> = {};

    if (studentIds.length > 0) {
      const { data: att } = await supabase
        .from('attendance')
        .select('student_id, status')
        .in('student_id', studentIds)
        .eq('batch_id', selectedBatch)
        .eq('date', date);

      att?.forEach(a => { map[a.student_id] = a.status; });
    }

    studentIds.forEach(id => { if (!map[id]) map[id] = 'absent'; });
    setAttendanceMap(map);
    setHasLoaded(true);
  };

  useEffect(() => { setHasLoaded(false); loadStudents(); }, [selectedBatch, date]);

  const toggleAttendance = (studentId: string) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: cycleStatus(prev[studentId] || 'absent'),
    }));
  };

  const saveAttendance = async () => {
    try {
      const records = Object.entries(attendanceMap).map(([student_id, status]) => ({
        student_id,
        batch_id: selectedBatch,
        date,
        status,
        marked_by: userId,
        institute_id: instituteId,
      }));
      const { error } = await supabase.from('attendance').upsert(records, {
        onConflict: 'student_id,batch_id,date',
      });
      if (error) throw error;
      toast.success('Attendance saved!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const displayStudents = searchTerm
    ? students.filter(s => {
        const name = (s.students as any)?.profiles?.name?.toLowerCase() || '';
        return name.includes(searchTerm.toLowerCase());
      })
    : students;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Mark Student Attendance</h2>
      <p className="text-sm text-muted-foreground">Tap the badge to cycle: Absent → Present (P) → Late (L) → Absent.</p>
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
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Reg No</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayStudents.map((s, index) => {
                  const student = s.students as any;
                  return (
                    <tr key={s.student_id} className="border-t">
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3">{student?.profiles?.name}</td>
                      <td className="p-3">{student?.reg_no}</td>
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
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [month, setMonth] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [feeMap, setFeeMap] = useState<Record<string, string>>({});
  const [amountMap, setAmountMap] = useState<Record<string, number>>({});
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
    if (!selectedBatch || !month) return;
    const { data } = await supabase
      .from('batch_students')
      .select('student_id, students(id, reg_no, profiles!students_user_id_profiles_fkey(name))')
      .eq('batch_id', selectedBatch);

    const studs = data || [];
    setStudents(studs);

    const studentIds = studs.map(s => s.student_id);
    const map: Record<string, string> = {};

    if (studentIds.length > 0) {
      const { data: fees } = await supabase
        .from('fees')
        .select('student_id, status, amount')
        .in('student_id', studentIds)
        .eq('month', month);

      const aMap: Record<string, number> = {};
      fees?.forEach(f => { map[f.student_id] = f.status; aMap[f.student_id] = Number(f.amount) || 0; });
      setAmountMap(prev => ({ ...prev, ...aMap }));
    }

    studentIds.forEach(id => { if (!map[id]) map[id] = 'unpaid'; });
    setFeeMap(map);
    setHasLoaded(true);
  };

  useEffect(() => { setHasLoaded(false); loadStudents(); }, [selectedBatch, month]);

  const toggleFee = (studentId: string) => {
    setFeeMap(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'paid' ? 'unpaid' : 'paid',
    }));
  };

  const saveFees = async () => {
    try {
      const records = Object.entries(feeMap).map(([student_id, status]) => ({
        student_id,
        month,
        status,
        institute_id: instituteId,
        updated_by: userId,
        amount: amountMap[student_id] || 0,
      }));
      const { error } = await supabase.from('fees').upsert(records, {
        onConflict: 'student_id,month',
      });
      if (error) throw error;
      toast.success('Fees saved!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const displayStudents = searchTerm
    ? students.filter(s => {
        const name = (s.students as any)?.profiles?.name?.toLowerCase() || '';
        return name.includes(searchTerm.toLowerCase());
      })
    : students;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2"><DollarSign className="h-5 w-5" /> Update Fees</h2>
      <div className="flex flex-wrap gap-3">
        <Select value={selectedBatch} onValueChange={setSelectedBatch}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Select batch" /></SelectTrigger>
          <SelectContent>
            {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-48" placeholder="Select month" />
        {students.length > 0 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-48" placeholder="Search student..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        )}
      </div>

      {hasLoaded && displayStudents.length > 0 && month && (
        <>
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">S.No</th>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Reg No</th>
                  <th className="text-left p-3 font-medium">Amount</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayStudents.map((s, index) => {
                  const student = s.students as any;
                  return (
                    <tr key={s.student_id} className="border-t">
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3">{student?.profiles?.name}</td>
                      <td className="p-3">{student?.reg_no}</td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min="0"
                          className="w-28"
                          value={amountMap[s.student_id] || ''}
                          onChange={e => setAmountMap(prev => ({ ...prev, [s.student_id]: Number(e.target.value) || 0 }))}
                          placeholder="₹ 0"
                        />
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => toggleFee(s.student_id)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            feeMap[s.student_id] === 'paid'
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-destructive text-destructive-foreground'
                          }`}
                        >
                          {feeMap[s.student_id] || 'unpaid'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Button onClick={saveFees}>Save Fees</Button>
        </>
      )}
    </div>
  );
};

export default TeacherDashboard;
