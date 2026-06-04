import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Inactive = () => {
  const navigate = useNavigate();
  const goHome = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">You are currently inactive</h1>
          <p className="text-muted-foreground">Please contact your institute to reactivate your account.</p>
          <Button onClick={goHome} className="gap-2"><Home className="h-4 w-4" /> Back to Home</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Inactive;
