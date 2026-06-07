import React from 'react';

export const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={`glass-panel rounded-xl p-8 w-full max-w-md mx-auto ${className}`}>
      {children}
    </div>
  );
};
