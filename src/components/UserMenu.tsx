
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { User, LogOut } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const UserMenu = () => {
  const [loading, setLoading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <User className="h-4 w-4 mr-2" />
          {(profile?.user_metadata as any)?.full_name || profile?.email || 'User'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled>
          <div className="flex flex-col">
            <span className="font-medium">{(profile?.user_metadata as any)?.full_name || 'User'}</span>
            <span className="text-sm text-gray-500">{profile?.email}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} disabled={loading}>
          <LogOut className="h-4 w-4 mr-2" />
          {loading ? 'Signing out...' : 'Sign Out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
