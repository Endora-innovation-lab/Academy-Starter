import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, Wallet, CalendarCheck } from 'lucide-react';

interface Props { studentId: string }

export default function StudentProfile({ studentId }: Props) {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [instituteCode, setInstituteCode] = useState('');
  const [games, setGames] = useState<string[]>([]);
  const [feeSummary, setFeeSummary] = useState({ total: 0, paid: 0, due: 0 });
  const [attSummary, setAttSummary] = useState({ present: 0, absent: 0, late: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: s } = await supabase.from('students').select('*').eq('id', studentId).maybeSingle();
      setStudent(s);
      if (s?.institute_id) {
        const { data: ins } = await supabase.from('institutes').select('code').eq('id', s.institute_id).maybeSingle();
        setInstituteCode(ins?.code || '');
      }
      const { data: sg } = await supabase
        .from('student_games')
        .select('games(name)')
        .eq('student_id', studentId);
      setGames((sg || []).map((r: any) => r.games?.name).filter(Boolean));

      const { data: fees } = await supabase
        .from('fees')
        .select('total_amount,paid_amount,due_amount')
        .eq('student_id', studentId);
      const f = (fees || []).reduce((a: any, r: any) => ({
        total: a.total + Number(r.total_amount || 0),
        paid: a.paid + Number(r.paid_amount || 0),
        due: a.due + Number(r.due_amount || 0),
      }), { total: 0, paid: 0, due: 0 });
      setFeeSummary(f);

      const { data: att } = await supabase.from('attendance').select('status').eq('student_id', studentId);
      const a = { present: 0, absent: 0, late: 0 };
      (att || []).forEach((r: any) => {
        if (r.status === 'present') a.present++;
        else if (r.status === 'late') a.late++;
        else if (r.status === 'absent') a.absent++;
      });
      setAttSummary(a);
      setLoading(false);
    })();
  }, [studentId]);

  if (loading) return <div className="py-12 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading…</div>;
  if (!student) return <div className="py-12 text-center text-muted-foreground">Profile not found</div>;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-xl font-bold">
              {(student.name || '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{student.name}</CardTitle>
              <CardDescription className="flex items-center gap-2 flex-wrap">
                <span>Reg No: {student.reg_no}</span>
                <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                  {student.status || 'active'}
                </Badge>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground italic mb-3">
            This profile is read-only. Contact your institute to update details.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Info label="Institute ID" value={instituteCode} />
            <Info label="Parent / Guardian" value={student.parent_name} />
            <Info label="Parent Mobile" value={student.parent_mobile} />
            <Info label="Date of Birth" value={student.dob} />
            <Info label="Gender" value={student.gender} />
            <Info label="Emergency Contact" value={student.emergency_contact} />
            <div className="sm:col-span-2"><Info label="Address" value={student.address} /></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Enrolled Games</CardTitle></CardHeader>
          <CardContent>
            {games.length ? <div className="flex flex-wrap gap-2">{games.map((g) => <Badge key={g} variant="outline">{g}</Badge>)}</div> : <p className="text-sm text-muted-foreground">None</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" /> Fee Summary</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-medium">₹{feeSummary.total.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="font-medium text-green-600">₹{feeSummary.paid.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span className="font-medium text-destructive">₹{feeSummary.due.toLocaleString()}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarCheck className="h-4 w-4" /> Attendance</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Present</span><span className="font-medium text-green-600">{attSummary.present}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Late</span><span className="font-medium text-amber-600">{attSummary.late}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Absent</span><span className="font-medium text-destructive">{attSummary.absent}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value || <span className="text-muted-foreground italic">Not set</span>}</div>
    </div>
  );
}
