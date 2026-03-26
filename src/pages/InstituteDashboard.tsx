import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Users, BookOpen, ClipboardList, DollarSign, Layers, Search, BarChart3, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const InstituteDashboard = () => {
  const { user, instituteId, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [hasBatches, setHasBatches] = useState<boolean | null>(null);

  useEffect(() => {
    if (!instituteId) return;
    const check = async () => {
      const { count } = await supabase.from('batches').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId);
      setHasBatches((count || 0) > 0);
    };
    check();
  }, [instituteId, activeTab]);

  const tabs = [
    { label: 'Overview', value: 'overview' },
    { label: 'Batches', value: 'batches' },
    { label: 'Students', value: 'students' },
    { label: 'Teachers', value: 'teachers' },
    { label: 'Attendance', value: 'attendance' },
    { label: 'Fees', value: 'fees' },
  ];

  if (loading || (user && !instituteId)) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading dashboard...</div>;
  }

  if (!user || !instituteId) {
    return <Navigate to="/login/institute" replace />;
  }

  return (
    <DashboardLayout title="Institute Dashboard" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'overview' && <OverviewTab instituteId={instituteId} />}
      {activeTab === 'batches' && <BatchesTab instituteId={instituteId} />}
      {activeTab === 'students' && <StudentsTab instituteId={instituteId} hasBatches={hasBatches} />}
      {activeTab === 'teachers' && <TeachersTab instituteId={instituteId} hasBatches={hasBatches} />}
      {activeTab === 'attendance' && <AttendanceTab instituteId={instituteId} />}
      {activeTab === 'fees' && <FeesTab instituteId={instituteId} />}
    </DashboardLayout>
  );
};

// ============= NO BATCH WARNING =============
const NoBatchWarning = ({ onGoToBatches }: { onGoToBatches?: () => void }) => (
  <Card className="border-destructive/50 bg-destructive/5">
    <CardContent className="pt-6 text-center space-y-3">
      <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
      <p className="font-semibold text-destructive">Please create a batch first</p>
      <p className="text-sm text-muted-foreground">You must create at least one batch before adding students or teachers.</p>
      {onGoToBatches && <Button variant="outline" onClick={onGoToBatches}>Go to Batches</Button>}
    </CardContent>
  </Card>
);

// ============= OVERVIEW TAB =============
const OverviewTab = ({ instituteId }: { instituteId: string }) => {
  const [stats, setStats] = useState({ present: 0, absent: 0, paid: 0, unpaid: 0, students: 0, teachers: 0, totalCollected: 0, totalPending: 0 });
  const [batches, setBatches] = useState<any[]>([]);
  const [filterBatch, setFilterBatch] = useState('all');
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    const fetchBatches = async () => {
      const { data } = await supabase.from('batches').select('id, name').eq('institute_id', instituteId);
      setBatches(data || []);
    };
    fetchBatches();
  }, [instituteId]);

  useEffect(() => {
    const fetchStats = async () => {
      const firstDay = `${filterMonth}-01`;
      const [year, month] = filterMonth.split('-').map(Number);
      const lastDay = new Date(year, month, 0).toISOString().split('T')[0];

      let attQuery = supabase.from('attendance').select('status').eq('institute_id', instituteId).gte('date', firstDay).lte('date', lastDay);
      let feeQuery = supabase.from('fees').select('status, amount').eq('institute_id', instituteId).eq('month', filterMonth);

      if (filterBatch !== 'all') {
        attQuery = attQuery.eq('batch_id', filterBatch);
        // For fees, filter by students in the batch
        const { data: batchStudents } = await supabase.from('batch_students').select('student_id').eq('batch_id', filterBatch);
        const studentIds = batchStudents?.map(bs => bs.student_id) || [];
        if (studentIds.length > 0) {
          feeQuery = feeQuery.in('student_id', studentIds);
        } else {
          setStats({ present: 0, absent: 0, paid: 0, unpaid: 0, students: 0, teachers: 0 });
          return;
        }
      }

      const [attRes, feeRes, stuRes, teaRes] = await Promise.all([
        attQuery,
        feeQuery,
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId),
        supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('institute_id', instituteId),
      ]);

      const attData = attRes.data || [];
      const feeData = feeRes.data || [];

      const paidFees = feeData.filter(f => f.status === 'paid');
      const unpaidFees = feeData.filter(f => f.status === 'unpaid');
      setStats({
        present: attData.filter(a => a.status === 'present').length,
        absent: attData.filter(a => a.status === 'absent').length,
        paid: paidFees.length,
        unpaid: unpaidFees.length,
        students: stuRes.count || 0,
        teachers: teaRes.count || 0,
        totalCollected: paidFees.reduce((sum, f) => sum + (Number((f as any).amount) || 0), 0),
        totalPending: unpaidFees.reduce((sum, f) => sum + (Number((f as any).amount) || 0), 0),
      });
    };
    fetchStats();
  }, [instituteId, filterBatch, filterMonth]);

  const [year, month] = filterMonth.split('-').map(Number);
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Monthly Review — {monthName}</h2>
        <div className="flex gap-2">
          <Select value={filterBatch} onValueChange={setFilterBatch}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Filter by batch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-48" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Total Students</p>
            <p className="text-3xl font-bold text-primary">{stats.students}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">Total Teachers</p>
            <p className="text-3xl font-bold text-primary">{stats.teachers}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Attendance Summary</CardTitle></CardHeader>
          <CardContent className="flex gap-6">
            <div>
              <p className="text-2xl font-bold text-accent">{stats.present}</p>
              <p className="text-sm text-muted-foreground">Present</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{stats.absent}</p>
              <p className="text-sm text-muted-foreground">Absent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Fee Summary</CardTitle></CardHeader>
          <CardContent className="flex gap-6">
            <div>
              <p className="text-2xl font-bold text-accent">{stats.paid}</p>
              <p className="text-sm text-muted-foreground">Paid</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{stats.unpaid}</p>
              <p className="text-sm text-muted-foreground">Unpaid</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ============= STUDENTS TAB =============
const StudentsTab = ({ instituteId, hasBatches }: { instituteId: string; hasBatches: boolean | null }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editStudent, setEditStudent] = useState<any>(null);
  const [createdCreds, setCreatedCreds] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [filterBatch, setFilterBatch] = useState('all');
  const [filterFee, setFilterFee] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [name, setName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [dob, setDob] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('students')
      .select('*, profiles!students_user_id_profiles_fkey(name)')
      .eq('institute_id', instituteId);

    const { data: batchData } = await supabase.from('batches').select('*').eq('institute_id', instituteId);
    setBatches(batchData || []);

    const { data: feesData } = await supabase.from('fees').select('student_id, status').eq('institute_id', instituteId);

    let filtered = data || [];

    if (filterBatch !== 'all') {
      const { data: batchStudents } = await supabase.from('batch_students').select('student_id').eq('batch_id', filterBatch);
      const studentIds = batchStudents?.map(bs => bs.student_id) || [];
      filtered = filtered.filter(s => studentIds.includes(s.id));
    }

    if (filterFee !== 'all') {
      const studentsWithStatus = feesData?.filter(f => f.status === filterFee).map(f => f.student_id) || [];
      if (filterFee === 'unpaid') {
        const paidStudents = feesData?.filter(f => f.status === 'paid').map(f => f.student_id) || [];
        filtered = filtered.filter(s => !paidStudents.includes(s.id) || studentsWithStatus.includes(s.id));
      } else {
        filtered = filtered.filter(s => studentsWithStatus.includes(s.id));
      }
    }

    setStudents(filtered);
    setLoading(false);
  };

  useEffect(() => { fetchStudents(); }, [instituteId, filterBatch, filterFee]);

  const displayStudents = searchTerm
    ? students.filter(s => {
        const sName = (s.profiles as any)?.name?.toLowerCase() || '';
        const sReg = s.reg_no?.toLowerCase() || '';
        const term = searchTerm.toLowerCase();
        return sName.includes(term) || sReg.includes(term);
      })
    : students;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: { action: 'create_student', name, reg_no: regNo, dob, parent_phone: parentPhone },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCreatedCreds(data.credentials);
      toast.success('Student added!');
      setShowAdd(false);
      setName(''); setRegNo(''); setDob(''); setParentPhone('');
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (studentId: string) => {
    if (!confirm('Delete this student?')) return;
    try {
      await supabase.functions.invoke('admin-operations', {
        body: { action: 'delete_student', student_id: studentId },
      });
      toast.success('Student deleted');
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.functions.invoke('admin-operations', {
        body: { action: 'update_student', student_id: editStudent.id, name, dob, parent_phone: parentPhone },
      });
      toast.success('Student updated');
      setShowEdit(false);
      setEditStudent(null);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (hasBatches === false) {
    return <NoBatchWarning />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5" /> Students</h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-48" placeholder="Search name or reg no..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Select value={filterBatch} onValueChange={setFilterBatch}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Filter by batch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterFee} onValueChange={setFilterFee}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Filter by fee" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fees</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Student</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Student</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-3">
                <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
                <div><Label>Registration Number</Label><Input value={regNo} onChange={e => setRegNo(e.target.value)} required /></div>
                <div><Label>DOB (dd-mm-yyyy)</Label><Input value={dob} onChange={e => setDob(e.target.value)} required placeholder="dd-mm-yyyy" /></div>
                <div><Label>Parent Phone</Label><Input value={parentPhone} onChange={e => setParentPhone(e.target.value)} /></div>
                <Button type="submit" className="w-full">Add Student</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {createdCreds && (
        <Card className="border-accent bg-accent/5">
          <CardContent className="pt-4">
            <p className="font-semibold text-accent">Login Credentials Created:</p>
            <p className="text-sm">Username: <strong>{createdCreds.username}</strong></p>
            <p className="text-sm">Password: <strong>{createdCreds.password}</strong></p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setCreatedCreds(null)}>Dismiss</Button>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Reg No</th>
              <th className="text-left p-3 font-medium">DOB</th>
              <th className="text-left p-3 font-medium">Parent Phone</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayStudents.map(s => (
              <tr key={s.id} className="border-t">
                <td className="p-3">{(s.profiles as any)?.name || 'N/A'}</td>
                <td className="p-3">{s.reg_no}</td>
                <td className="p-3">{s.dob}</td>
                <td className="p-3">{s.parent_phone || '-'}</td>
                <td className="p-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => {
                    setEditStudent(s);
                    setName((s.profiles as any)?.name || '');
                    setDob(s.dob);
                    setParentPhone(s.parent_phone || '');
                    setShowEdit(true);
                  }}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
            {displayStudents.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No students found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-3">
            <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
            <div><Label>DOB (dd-mm-yyyy)</Label><Input value={dob} onChange={e => setDob(e.target.value)} required /></div>
            <div><Label>Parent Phone</Label><Input value={parentPhone} onChange={e => setParentPhone(e.target.value)} /></div>
            <Button type="submit" className="w-full">Update</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============= TEACHERS TAB =============
const TeachersTab = ({ instituteId, hasBatches }: { instituteId: string; hasBatches: boolean | null }) => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTeacher, setEditTeacher] = useState<any>(null);
  const [createdCreds, setCreatedCreds] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthYear, setBirthYear] = useState('');

  const fetchTeachers = async () => {
    const { data } = await supabase
      .from('teachers')
      .select('*, profiles!teachers_user_id_profiles_fkey(name, email)')
      .eq('institute_id', instituteId);
    setTeachers(data || []);
  };

  useEffect(() => { fetchTeachers(); }, [instituteId]);

  const displayTeachers = searchTerm
    ? teachers.filter(t => {
        const tName = (t.profiles as any)?.name?.toLowerCase() || '';
        const tEmail = (t.profiles as any)?.email?.toLowerCase() || '';
        const term = searchTerm.toLowerCase();
        return tName.includes(term) || tEmail.includes(term);
      })
    : teachers;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: { action: 'create_teacher', name, email, phone, birth_year: birthYear },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setCreatedCreds(data.credentials);
      toast.success('Teacher added!');
      setShowAdd(false);
      setName(''); setEmail(''); setPhone(''); setBirthYear('');
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (teacherId: string) => {
    if (!confirm('Delete this teacher?')) return;
    try {
      await supabase.functions.invoke('admin-operations', {
        body: { action: 'delete_teacher', teacher_id: teacherId },
      });
      toast.success('Teacher deleted');
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.functions.invoke('admin-operations', {
        body: { action: 'update_teacher', teacher_id: editTeacher.id, name, phone, birth_year: birthYear },
      });
      toast.success('Teacher updated');
      setShowEdit(false);
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (hasBatches === false) {
    return <NoBatchWarning />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5" /> Teachers</h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-48" placeholder="Search name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Teacher</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Teacher</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-3">
                <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
                <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} required /></div>
                <div><Label>Birth Year</Label><Input value={birthYear} onChange={e => setBirthYear(e.target.value)} required placeholder="e.g. 1990" /></div>
                <Button type="submit" className="w-full">Add Teacher</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {createdCreds && (
        <Card className="border-accent bg-accent/5">
          <CardContent className="pt-4">
            <p className="font-semibold text-accent">Login Credentials Created:</p>
            <p className="text-sm">Email: <strong>{createdCreds.email}</strong></p>
            <p className="text-sm">Password: <strong>{createdCreds.password}</strong></p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setCreatedCreds(null)}>Dismiss</Button>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-left p-3 font-medium">Phone</th>
              <th className="text-left p-3 font-medium">Birth Year</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayTeachers.map(t => (
              <tr key={t.id} className="border-t">
                <td className="p-3">{(t.profiles as any)?.name || 'N/A'}</td>
                <td className="p-3">{(t.profiles as any)?.email || '-'}</td>
                <td className="p-3">{t.phone}</td>
                <td className="p-3">{t.birth_year}</td>
                <td className="p-3 flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => {
                    setEditTeacher(t);
                    setName((t.profiles as any)?.name || '');
                    setPhone(t.phone);
                    setBirthYear(t.birth_year);
                    setShowEdit(true);
                  }}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
            {displayTeachers.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No teachers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Teacher</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-3">
            <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
            <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} required /></div>
            <div><Label>Birth Year</Label><Input value={birthYear} onChange={e => setBirthYear(e.target.value)} required /></div>
            <Button type="submit" className="w-full">Update</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============= BATCHES TAB =============
const BatchesTab = ({ instituteId }: { instituteId: string }) => {
  const [batches, setBatches] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState<any>(null);
  const [batchName, setBatchName] = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [enrollRegNo, setEnrollRegNo] = useState('');
  const [batchStudents, setBatchStudents] = useState<any[]>([]);
  const [batchTeachers, setBatchTeachers] = useState<any[]>([]);

  const fetchData = async () => {
    const [{ data: b }, { data: t }, { data: s }] = await Promise.all([
      supabase.from('batches').select('*').eq('institute_id', instituteId),
      supabase.from('teachers').select('*, profiles!teachers_user_id_profiles_fkey(name)').eq('institute_id', instituteId),
      supabase.from('students').select('*, profiles!students_user_id_profiles_fkey(name)').eq('institute_id', instituteId),
    ]);
    setBatches(b || []);
    setTeachers(t || []);
    setStudents(s || []);
  };

  const fetchBatchDetails = async (batchId: string) => {
    const [{ data: bs }, { data: bt }] = await Promise.all([
      supabase.from('batch_students').select('*, students(id, reg_no, profiles!students_user_id_profiles_fkey(name))').eq('batch_id', batchId),
      supabase.from('batch_teachers').select('*, teachers(id, profiles!teachers_user_id_profiles_fkey(name))').eq('batch_id', batchId),
    ]);
    setBatchStudents(bs || []);
    setBatchTeachers(bt || []);
  };

  useEffect(() => { fetchData(); }, [instituteId]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: newBatch, error } = await supabase.from('batches').insert({
        name: batchName,
        institute_id: instituteId,
        teacher_id: selectedTeachers[0] || null,
      }).select().single();
      if (error) throw error;

      if (selectedTeachers.length > 0 && newBatch) {
        await supabase.from('batch_teachers').insert(
          selectedTeachers.map(tid => ({ batch_id: newBatch.id, teacher_id: tid }))
        );
      }

      toast.success('Batch created');
      setShowAdd(false);
      setBatchName('');
      setSelectedTeachers([]);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEditBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await supabase.from('batches').update({ name: batchName }).eq('id', showEdit.id);
      toast.success('Batch updated');
      setShowEdit(null);
      setBatchName('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm('Delete this batch? Students will be unassigned.')) return;
    try {
      await supabase.from('batch_students').delete().eq('batch_id', batchId);
      await supabase.from('batch_teachers').delete().eq('batch_id', batchId);
      await supabase.from('batches').delete().eq('id', batchId);
      toast.success('Batch deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEnrollByRegNo = async () => {
    if (!enrollRegNo.trim() || !showAssign) return;
    const student = students.find(s => s.reg_no.toLowerCase() === enrollRegNo.trim().toLowerCase());
    if (!student) { toast.error('Student not found with that Reg Number'); return; }
    try {
      await supabase.from('batch_students').insert({ batch_id: showAssign, student_id: student.id });
      toast.success('Student enrolled');
      setEnrollRegNo('');
      fetchBatchDetails(showAssign);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemoveFromBatch = async (bsId: string) => {
    await supabase.from('batch_students').delete().eq('id', bsId);
    if (showAssign) fetchBatchDetails(showAssign);
  };

  const handleAddTeacherToBatch = async (teacherId: string) => {
    if (!showAssign) return;
    try {
      await supabase.from('batch_teachers').insert({ batch_id: showAssign, teacher_id: teacherId });
      toast.success('Teacher added to batch');
      fetchBatchDetails(showAssign);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemoveTeacherFromBatch = async (btId: string) => {
    await supabase.from('batch_teachers').delete().eq('id', btId);
    if (showAssign) fetchBatchDetails(showAssign);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><Layers className="h-5 w-5" /> Batches</h2>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create Batch</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Batch</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateBatch} className="space-y-3">
              <div><Label>Batch Name</Label><Input value={batchName} onChange={e => setBatchName(e.target.value)} required /></div>
              <div>
                <Label>Assign Teachers (select multiple)</Label>
                <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1 mt-1">
                  {teachers.map(t => (
                    <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedTeachers.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedTeachers(prev => [...prev, t.id]);
                          else setSelectedTeachers(prev => prev.filter(id => id !== t.id));
                        }}
                      />
                      {(t.profiles as any)?.name}
                    </label>
                  ))}
                  {teachers.length === 0 && <p className="text-xs text-muted-foreground">No teachers available yet</p>}
                </div>
              </div>
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {batches.map(b => (
          <Card key={b.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{b.name}</CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setShowEdit(b); setBatchName(b.name); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteBatch(b.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button size="sm" variant="outline" onClick={() => { setShowAssign(b.id); fetchBatchDetails(b.id); }}>
                Manage
              </Button>
            </CardContent>
          </Card>
        ))}
        {batches.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-8">No batches created</p>}
      </div>

      <Dialog open={!!showEdit} onOpenChange={() => setShowEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Batch</DialogTitle></DialogHeader>
          <form onSubmit={handleEditBatch} className="space-y-3">
            <div><Label>Batch Name</Label><Input value={batchName} onChange={e => setBatchName(e.target.value)} required /></div>
            <Button type="submit" className="w-full">Update</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showAssign} onOpenChange={() => setShowAssign(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Manage Batch</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Teachers</h4>
              <div className="flex gap-2 mb-2">
                <Select onValueChange={handleAddTeacherToBatch}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Add teacher..." /></SelectTrigger>
                  <SelectContent>
                    {teachers.filter(t => !batchTeachers.some(bt => (bt.teachers as any)?.id === t.id)).map(t => (
                      <SelectItem key={t.id} value={t.id}>{(t.profiles as any)?.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                {batchTeachers.map(bt => (
                  <div key={bt.id} className="flex items-center justify-between p-2 rounded bg-muted">
                    <span className="text-sm">{(bt.teachers as any)?.profiles?.name}</span>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemoveTeacherFromBatch(bt.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Students</h4>
              <div className="flex gap-2 mb-2">
                <Input placeholder="Enter Reg Number" value={enrollRegNo} onChange={e => setEnrollRegNo(e.target.value)} className="flex-1" />
                <Button onClick={handleEnrollByRegNo}>Add</Button>
              </div>
              <div className="space-y-1">
                {batchStudents.map(bs => (
                  <div key={bs.id} className="flex items-center justify-between p-2 rounded bg-muted">
                    <span className="text-sm">{(bs.students as any)?.profiles?.name} ({(bs.students as any)?.reg_no})</span>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemoveFromBatch(bs.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {batchStudents.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No students in this batch</p>}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ============= ATTENDANCE TAB =============
const AttendanceTab = ({ instituteId }: { instituteId: string }) => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [filterBatch, setFilterBatch] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    const fetchBatches = async () => {
      const { data } = await supabase.from('batches').select('id, name').eq('institute_id', instituteId);
      setBatches(data || []);
    };
    fetchBatches();
  }, [instituteId]);

  const fetchAttendance = async () => {
    let query = supabase
      .from('attendance')
      .select('*, students(reg_no, profiles!students_user_id_profiles_fkey(name)), batches(name)')
      .eq('institute_id', instituteId)
      .order('date', { ascending: false });
    if (filterDate) query = query.eq('date', filterDate);
    if (filterBatch !== 'all') query = query.eq('batch_id', filterBatch);
    const { data } = await query.limit(200);
    setAttendance(data || []);
  };

  useEffect(() => { fetchAttendance(); }, [instituteId, filterDate, filterBatch]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Attendance</h2>
        <div className="flex gap-2">
          <Select value={filterBatch} onValueChange={setFilterBatch}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Filter by batch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-48" />
        </div>
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Student</th>
              <th className="text-left p-3 font-medium">Reg No</th>
              <th className="text-left p-3 font-medium">Batch</th>
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map(a => (
              <tr key={a.id} className="border-t">
                <td className="p-3">{(a.students as any)?.profiles?.name}</td>
                <td className="p-3">{(a.students as any)?.reg_no}</td>
                <td className="p-3">{(a.batches as any)?.name || '-'}</td>
                <td className="p-3">{a.date}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    a.status === 'present' ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'
                  }`}>{a.status}</span>
                </td>
              </tr>
            ))}
            {attendance.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No attendance records</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============= FEES TAB =============
const FeesTab = ({ instituteId }: { instituteId: string }) => {
  const [fees, setFees] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchFees = async () => {
    let query = supabase
      .from('fees')
      .select('*, students(reg_no, profiles!students_user_id_profiles_fkey(name))')
      .eq('institute_id', instituteId)
      .order('month', { ascending: false });
    if (filterStatus !== 'all') query = query.eq('status', filterStatus);
    if (filterMonth) query = query.eq('month', filterMonth);
    const { data } = await query;
    setFees(data || []);
  };

  useEffect(() => { fetchFees(); }, [instituteId, filterStatus, filterMonth]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2"><DollarSign className="h-5 w-5" /> Fees</h2>
        <div className="flex gap-2">
          <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-48" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Student</th>
              <th className="text-left p-3 font-medium">Reg No</th>
              <th className="text-left p-3 font-medium">Month</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {fees.map(f => (
              <tr key={f.id} className="border-t">
                <td className="p-3">{(f.students as any)?.profiles?.name}</td>
                <td className="p-3">{(f.students as any)?.reg_no}</td>
                <td className="p-3">{f.month}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    f.status === 'paid' ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'
                  }`}>{f.status}</span>
                </td>
              </tr>
            ))}
            {fees.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No fee records</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InstituteDashboard;
