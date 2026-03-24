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
import { ClipboardList, DollarSign, Layers, Search } from 'lucide-react';

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
      {activeTab === 'attendance' && teacherRecord && <MarkAttendanceTab teacherId={teacherRecord.id} instituteId={instituteId} userId={user.id} />}
      {activeTab === 'fees' && teacherRecord && <UpdateFeesTab teacherId={teacherRecord.id} instituteId={instituteId} userId={user.id} />}
    </DashboardLayout>
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
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Reg No</th>
                </tr>
              </thead>
              <tbody>
                {displayStudents.map(s => (
                  <tr key={s.id} className="border-t">
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
      // Fetch attendance for this specific batch + date
      const { data: att } = await supabase
        .from('attendance')
        .select('student_id, status')
        .in('student_id', studentIds)
        .eq('batch_id', selectedBatch)
        .eq('date', date);

      att?.forEach(a => { map[a.student_id] = a.status; });
    }

    // Default ALL to absent
    studentIds.forEach(id => { if (!map[id]) map[id] = 'absent'; });
    setAttendanceMap(map);
    setHasLoaded(true);
  };

  useEffect(() => { setHasLoaded(false); loadStudents(); }, [selectedBatch, date]);

  const toggleAttendance = (studentId: string) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present',
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
      <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Mark Attendance</h2>
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
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Reg No</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayStudents.map(s => {
                  const student = s.students as any;
                  return (
                    <tr key={s.student_id} className="border-t">
                      <td className="p-3">{student?.profiles?.name}</td>
                      <td className="p-3">{student?.reg_no}</td>
                      <td className="p-3">
                        <button
                          onClick={() => toggleAttendance(s.student_id)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            attendanceMap[s.student_id] === 'present'
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-destructive text-destructive-foreground'
                          }`}
                        >
                          {attendanceMap[s.student_id] || 'absent'}
                        </button>
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
        .select('student_id, status')
        .in('student_id', studentIds)
        .eq('month', month);

      fees?.forEach(f => { map[f.student_id] = f.status; });
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
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Reg No</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayStudents.map(s => {
                  const student = s.students as any;
                  return (
                    <tr key={s.student_id} className="border-t">
                      <td className="p-3">{student?.profiles?.name}</td>
                      <td className="p-3">{student?.reg_no}</td>
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
