'use client';

import { Button } from '@/components/ui/Button';
import { logoutAction } from '../../../../actions/auth';

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button
        type="submit"
        className="w-full rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] py-6 text-sm font-medium text-white transition-all"
      >
        Logout
      </Button>
    </form>
  );
}
