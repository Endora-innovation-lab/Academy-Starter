import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, Layers, User } from 'lucide-react';

interface Props { teacherId: string; hideAssignments?: boolean }

const NotSet = () => <span className="text-muted-foreground italic">not set</span>;

export default function TeacherProfile({ teacherId, hideAssignments }: Props) {
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [instituteCode, setInstituteCode] = useState<string>('');
  const [games, setGames] = useState<string[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: t } = await supabase.from('teachers').select('*').eq('id', teacherId).maybeSingle();
      setTeacher(t);
      if (t?.user_id) {
        const { data: p } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('user_id', t.user_id)
          .maybeSingle();
        setProfile(p);
      }
      if (t?.institute_id) {
        const { data: ins } = await supabase.from('institutes').select('code').eq('id', t.institute_id).maybeSingle();
        setInstituteCode(ins?.code || '');
      }
      const { data: bts } = await supabase
        .from('batch_teachers')
        .select('batches(id,name,game_id,games(name))')
        .eq('teacher_id', teacherId);
      const bs = (bts || []).map((r: any) => r.batches).filter(Boolean);
      setBatches(bs.map((b: any) => ({ id: b.id, name: b.name })));
      const gameSet = new Set<string>();
      bs.forEach((b: any) => { if (b.games?.name) gameSet.add(b.games.name); });
      setGames(Array.from(gameSet));
      setLoading(false);
    })();
  }, [teacherId]);

  if (loading) return <div className="py-12 text-center text-muted-foreground"><Loader2 className="h-5 w-5 inline animate-spin mr-2" />Loading…</div>;
  if (!teacher) return <div className="py-12 text-center text-muted-foreground">Profile not found</div>;

  const name = profile?.name || '';
  const role = teacher.role === 'principal' ? 'Principal' : 'Teacher';

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-xl font-bold">
              {(name || '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-xl">{name || <NotSet />}</CardTitle>
              <CardDescription className="flex items-center gap-2 flex-wrap mt-1">
                <span>ID: {teacher.teacher_id || teacher.id.slice(0, 8)}</span>
                <Badge variant="outline">{role}</Badge>
                <Badge variant={teacher.status === 'inactive' ? 'secondary' : 'default'}>
                  {teacher.status === 'inactive' ? 'Inactive' : 'Active'}
                </Badge>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground italic mb-3">
            This profile is read-only. To update these details, use the Add/Edit Teacher option in the institute dashboard.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Info label="Institute ID" value={instituteCode} />
            <Info label="Mobile Number" value={teacher.phone} />
            <Info label="Email" value={profile?.email} />
            <Info label="Gender" value={teacher.gender} />
            <Info label="Date of Birth" value={teacher.date_of_birth} />
            <Info label="Blood Group" value={teacher.blood_group} />
            <Info label="Emergency Contact" value={teacher.emergency_contact} />
            <Info label="Role" value={role} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Assigned Games</CardTitle></CardHeader>
          <CardContent>
            {games.length ? (
              <div className="flex flex-wrap gap-2">{games.map((g) => <Badge key={g} variant="outline">{g}</Badge>)}</div>
            ) : <p className="text-sm text-muted-foreground">No games assigned</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4" /> Assigned Batches</CardTitle></CardHeader>
          <CardContent>
            {batches.length ? (
              <ul className="space-y-1.5 text-sm">{batches.map((b) => <li key={b.id} className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" />{b.name}</li>)}</ul>
            ) : <p className="text-sm text-muted-foreground">No batches assigned</p>}
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
      <div className="font-medium">{value || <NotSet />}</div>
    </div>
  );
}
