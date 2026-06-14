import { Button } from '@react-email/components';
import * as React from 'react';

interface AegisButtonProps {
  href: string;
  children: React.ReactNode;
}

export const AegisButton: React.FC<AegisButtonProps> = ({ href, children }) => {
  return (
    <Button
      href={href}
      className="bg-brand text-background font-bold py-3 px-6 rounded-md uppercase tracking-wider text-sm inline-block"
    >
      {children}
    </Button>
  );
};
