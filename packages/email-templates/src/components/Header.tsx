import * as React from 'react';
import { Heading, Text, Img } from '@react-email/components';

export const Header = () => {
  return (
    <div className="mb-8">
      {/* Fallback to text if logo fails, but keeping it styled cyberpunk */}
      <Heading className="text-brand text-2xl font-bold tracking-widest uppercase m-0">
        AEGIS // SECURITY
      </Heading>
      <div className="h-1 w-16 bg-brand mt-2 mb-6"></div>
    </div>
  );
};
