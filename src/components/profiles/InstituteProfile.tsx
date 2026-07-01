import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Building2, MapPin, Briefcase, Sparkles, ClockIcon, Loader2, Hash } from 'lucide-react';

interface Props { instituteId: string }

const sections = [
  { id: 'basic', label: 'Basic Info', icon: Building2 },
  { id: 'address', label: 'Address', icon: MapPin },
  { id: 'business', label: 'Business', icon: Briefcase },
  { id: 'attendance', label: 'Attendance Settings', icon: ClockIcon },
  { id: 'ids', label: 'ID Generation', icon: Hash },
  { id: 'subscription', label: 'Subscription', icon: Sparkles },
];

export default function InstituteProfile({ instituteId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState('basic');
  const [showBeta, setShowBeta] = useState(false);
  const [data, setData] = useState<any>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from('institutes').select('*').eq('id', instituteId).maybeSingle();
      if (error) toast.error(error.message);
      setData(data || {});
      setLoading(false);
    })();
  }, [instituteId]);

  const set = (k: string, v: any) => setData((d: any) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    const { id, code, created_at, user_id, ...payload } = data;
    const { error } = await supabase.from('institutes').update(payload).eq('id', instituteId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Profile saved');
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading profile…</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 md:gap-6">
      {/* Side nav */}
      <Card className="h-fit md:sticky md:top-20">
        <CardContent className="p-2">
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap text-left transition ${
                    isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {s.label}
                </button>
              );
            })}
          </nav>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {active === 'basic' && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Core details about your institute</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Institute Logo URL" v={data.logo_url} on={(v) => set('logo_url', v)} placeholder="https://..." />
              <Field label="Institute Name" v={data.name} on={(v) => set('name', v)} />
              <div>
                <Label>Institute ID (read-only)</Label>
                <Input value={data.code || ''} readOnly className="bg-muted" />
              </div>
              <Field label="Institute Type" v={data.institute_type} on={(v) => set('institute_type', v)} placeholder="e.g. Martial Arts Academy" />
              <Field label="Owner / Director Name" v={data.owner_name} on={(v) => set('owner_name', v)} />
              <Field label="Contact Number" v={data.contact_number} on={(v) => set('contact_number', v)} />
              <Field label="Email Address" v={data.email} on={(v) => set('email', v)} type="email" />
              <div className="sm:col-span-2">
                <Label>About</Label>
                <Textarea value={data.about || ''} onChange={(e) => set('about', e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>
        )}

        {active === 'address' && (
          <Card>
            <CardHeader><CardTitle>Address</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><Field label="Address" v={data.address} on={(v) => set('address', v)} /></div>
              <Field label="City" v={data.city} on={(v) => set('city', v)} />
              <Field label="State" v={data.state} on={(v) => set('state', v)} />
              <Field label="Country" v={data.country} on={(v) => set('country', v)} />
              <Field label="PIN Code" v={data.pin_code} on={(v) => set('pin_code', v)} />
            </CardContent>
          </Card>
        )}

        {active === 'business' && (
          <Card>
            <CardHeader><CardTitle>Business Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Established Year" v={data.established_year} on={(v) => set('established_year', v ? parseInt(v) : null)} type="number" />
              <Field label="Website" v={data.website} on={(v) => set('website', v)} placeholder="https://..." />
              <Field label="Facebook" v={data.facebook} on={(v) => set('facebook', v)} />
              <Field label="Instagram" v={data.instagram} on={(v) => set('instagram', v)} />
              <Field label="YouTube" v={data.youtube} on={(v) => set('youtube', v)} />
              <Field label="Registration Number" v={data.registration_number} on={(v) => set('registration_number', v)} />
              <Field label="GST Number" v={data.gst_number} on={(v) => set('gst_number', v)} />
              <Field label="Branch Count" v={data.branch_count} on={(v) => set('branch_count', v ? parseInt(v) : null)} type="number" />
            </CardContent>
          </Card>
        )}

        {active === 'attendance' && (
          <Card>
            <CardHeader>
              <CardTitle>Attendance Settings</CardTitle>
              <CardDescription>Configure rolling attendance behavior for your institute</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field
                label="Attendance Window Duration (minutes)"
                v={data.attendance_window_minutes}
                on={(v) => set('attendance_window_minutes', v ? parseInt(v) : 180)}
                type="number"
                placeholder="180"
              />
              <p className="text-xs text-muted-foreground -mt-2">Once a session starts, teachers and students can be marked within this window (default 180 = 3 hours).</p>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium">Auto Absent</div>
                  <div className="text-xs text-muted-foreground">When the window expires, unmarked entries become Absent.</div>
                </div>
                <Switch checked={!!data.attendance_auto_absent} onCheckedChange={(v) => set('attendance_auto_absent', v)} />
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium">Enable Attendance Automation</div>
                  <div className="text-xs text-muted-foreground">Enables rolling sessions and the 1-hour teacher Present limit.</div>
                </div>
                <Switch checked={!!data.attendance_automation_enabled} onCheckedChange={(v) => set('attendance_automation_enabled', v)} />
              </div>
            </CardContent>
          </Card>
        )}

        {active === 'ids' && (
          <Card>
            <CardHeader>
              <CardTitle>ID Generation Settings</CardTitle>
              <CardDescription>
                Control how Teacher, Student, Batch and Game IDs are created and displayed. Auto-generated IDs are never reused and remain unique within your institute.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <IdToggle
                title="Automatic Teacher ID"
                desc="Auto-generate IDs like TCH0001, TCH0002. When OFF, staff can enter a custom Teacher ID (unique per institute)."
                checked={data.auto_teacher_id !== false}
                onChange={(v) => set('auto_teacher_id', v)}
              />
              <IdToggle
                title="Automatic Student Registration Number"
                desc="Auto-generate IDs like STU0001, STU0002. When OFF, staff can enter a custom Reg No (unique per institute)."
                checked={data.auto_student_id !== false}
                onChange={(v) => set('auto_student_id', v)}
              />
              <IdToggle
                title="Automatic Batch ID"
                desc="Auto-generate IDs like BAT0001, BAT0002."
                checked={data.auto_batch_id !== false}
                onChange={(v) => set('auto_batch_id', v)}
              />
              <IdToggle
                title="Show Batch ID in UI"
                desc="When OFF, Batch IDs stay in the database but are hidden from lists and forms."
                checked={data.show_batch_id !== false}
                onChange={(v) => set('show_batch_id', v)}
              />
              <IdToggle
                title="Automatic Game ID"
                desc="Auto-generate IDs like GAM0001, GAM0002."
                checked={data.auto_game_id !== false}
                onChange={(v) => set('auto_game_id', v)}
              />
              <IdToggle
                title="Show Game ID in UI"
                desc="When OFF, Game IDs stay in the database but are hidden from lists and forms."
                checked={!!data.show_game_id}
                onChange={(v) => set('show_game_id', v)}
              />
            </CardContent>
          </Card>
        )}

        {active === 'subscription' && (
          <Card>
            <CardHeader><CardTitle>Subscription Plan</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0">
                  {(data.subscription_plan || 'beta').toUpperCase()}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setShowBeta(true)}>View details</Button>
              </div>
              <p className="text-sm text-muted-foreground">You're currently on the beta plan. All features are available while we collect feedback.</p>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-2 sticky bottom-0 bg-background/80 backdrop-blur py-3">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Changes
          </Button>
        </div>
      </div>

      <Dialog open={showBeta} onOpenChange={setShowBeta}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-center">🚀 You're in the Beta Version</DialogTitle>
            <DialogDescription className="text-center">
              Premium subscription plans will be available soon. Enjoy full access in the meantime!
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowBeta(false)} className="mt-2">Got it</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, v, on, type = 'text', placeholder }: { label: string; v: any; on: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={v ?? ''} onChange={(e) => on(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function IdToggle({ title, desc, checked, onChange }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3 gap-4">
      <div className="min-w-0">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
