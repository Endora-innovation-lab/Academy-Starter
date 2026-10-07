import React from 'react';
import logo from '@/assets/logo.png';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Download, LogIn, CheckSquare, Wallet, Layers, ShieldCheck, Smartphone, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { registrationWhatsAppUrl } from '@/lib/registrationContact';
import { canInstall, onInstallChange, promptInstall, isStandalone } from '@/lib/pwa';

const features = [
  { icon: CheckSquare, title: 'Attendance', desc: 'Mark P / L / A in seconds, per batch.' },
  { icon: Wallet, title: 'Fees', desc: 'Per-game fees, partial payments, history.' },
  { icon: Layers, title: 'Games & Batches', desc: 'Organise courses, batches and students.' },
  { icon: ShieldCheck, title: 'Role access', desc: 'Institute, principal, teacher, student.' },
];

const Index = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [installable, setInstallable] = React.useState(canInstall());

  React.useEffect(() => onInstallChange(() => setInstallable(canInstall())), []);

  React.useEffect(() => {
    if (user && role) {
      if (role === 'admin') navigate('/dashboard/institute');
      else if (role === 'teacher') {
        (async () => {
          const { data: t } = await supabase.from('teachers').select('role').eq('user_id', user.id).maybeSingle();
          navigate(t?.role === 'principal' ? '/dashboard/principal' : '/dashboard/teacher');
        })();
      } else if (role === 'student') navigate('/dashboard/student');
    }
  }, [user, role]);

  const handleDownload = async () => {
    if (!isStandalone() && canInstall()) {
      await promptInstall();
    }
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Academy Starter" className="h-8 w-8 rounded-lg" />
            <span className="font-bold tracking-tight">Academy Starter</span>
          </Link>
          <Button size="sm" variant="ghost" asChild>
            <Link to="/login"><LogIn className="h-4 w-4 mr-1.5" />Login</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-4 pt-14 pb-16 md:pt-24 md:pb-24 grid md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground mb-5">
              <Smartphone className="h-3.5 w-3.5" /> Works on phone, tablet & desktop
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-4">
              Your academy,{' '}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, hsl(220,100%,55%), hsl(265,85%,55%))' }}>
                in your pocket.
              </span>
            </h1>
            <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto md:mx-0">
              Attendance, fees and batches — one simple app for institutes, teachers and students.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Button
                size="lg"
                onClick={handleDownload}
                className="h-12 px-7 text-base font-semibold text-primary-foreground shadow-lg border-0"
                style={{ backgroundImage: 'linear-gradient(135deg, hsl(220,100%,55%), hsl(265,85%,55%))' }}
              >
                <Download className="h-5 w-5 mr-2" /> {installable ? 'Download App' : 'Open App'}
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-7 text-base" asChild>
                <Link to="/login">Login <ArrowRight className="h-4 w-4 ml-2" /></Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Free to install · No app store needed</p>
          </div>

          {/* Phone mock */}
          <div className="flex justify-center">
            <div className="relative w-64 h-[30rem] rounded-[2.5rem] border-8 border-foreground/90 bg-card shadow-2xl overflow-hidden">
              <div className="h-28 p-4 text-primary-foreground" style={{ backgroundImage: 'linear-gradient(135deg, hsl(220,100%,55%), hsl(265,85%,55%))' }}>
                <p className="text-xs opacity-80">Today</p>
                <p className="text-lg font-bold">Silambam · Batch A</p>
                <p className="text-xs mt-1" style={{ color: 'hsl(42,100%,65%)' }}>18 present · 2 late</p>
              </div>
              <div className="p-3 space-y-2">
                {['Arun', 'Divya', 'Karthik', 'Meena', 'Rahul', 'Sneha'].map((n, i) => (
                  <div key={n} className="flex items-center justify-between rounded-xl border px-3 py-2">
                    <span className="text-sm font-medium">{n}</span>
                    <span className={`text-xs font-bold rounded-md px-2 py-0.5 ${i === 2 ? 'bg-secondary text-secondary-foreground' : i === 4 ? 'bg-destructive/15 text-destructive' : 'bg-primary/10 text-primary'}`}>
                      {i === 2 ? 'L' : i === 4 ? 'A' : 'P'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t bg-card">
          <div className="max-w-5xl mx-auto px-4 py-14 grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title}>
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>© 2026 Academy Starter</span>
          <a href="https://forms.gle/3PsfR181KFEMnXkB7" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Feedback</a>
        </div>
      </footer>
    </div>
  );
};

export default Index;
