import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { user, role } = useAuth();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'admin') {
      toast.error('Only institute admins can reset passwords');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-operations', {
        body: { action: 'reset_password', email, new_password: newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Password reset successfully');
      setDone(true);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user || role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <KeyRound className="mx-auto h-10 w-10 text-primary mb-2" />
            <CardTitle>Password Reset</CardTitle>
            <CardDescription>Only institute admins can reset passwords. Please login as an admin first.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/login/institute">
              <Button className="w-full">Go to Institute Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <KeyRound className="mx-auto h-10 w-10 text-primary mb-2" />
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>Reset password for a user in your institute</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="text-center space-y-4">
              <p className="text-accent font-medium">Password reset successfully!</p>
              <Link to="/dashboard/institute"><Button className="w-full">Back to Dashboard</Button></Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label>User's Email (Institute Login Email)</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
