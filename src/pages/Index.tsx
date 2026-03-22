import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, UserCheck, BookOpen, Building2 } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-primary text-primary-foreground py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/20">
              <GraduationCap className="h-9 w-9" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Academy Starter System</h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Complete academy management — students, teachers, attendance, fees — all in one place.
          </p>
        </div>
      </div>

      {/* Login Cards */}
      <div className="max-w-4xl mx-auto px-4 -mt-8">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Institute</CardTitle>
              <CardDescription>Admin access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/login/institute" className="block">
                <Button className="w-full">Login</Button>
              </Link>
              <Link to="/register" className="block">
                <Button variant="outline" className="w-full">Register</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Teacher</CardTitle>
              <CardDescription>Attendance & Fees</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/login/teacher" className="block">
                <Button className="w-full">Login</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                <UserCheck className="h-6 w-6 text-accent" />
              </div>
              <CardTitle className="text-lg">Student / Parent</CardTitle>
              <CardDescription>View records</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/login/student" className="block">
                <Button className="w-full bg-accent hover:bg-accent/90">Login</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-8">Everything You Need</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { title: 'Student Management', desc: 'Add, edit, and manage student records' },
            { title: 'Teacher Management', desc: 'Create teacher accounts with auto-generated credentials' },
            { title: 'Batch Organization', desc: 'Group students into batches with assigned teachers' },
            { title: 'Attendance Tracking', desc: 'Mark and view attendance by date and batch' },
            { title: 'Fee Management', desc: 'Track paid/unpaid fee status monthly' },
            { title: 'Role-Based Access', desc: 'Secure dashboards for admins, teachers, and students' },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border bg-card p-4">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
