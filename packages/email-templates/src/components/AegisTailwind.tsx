import * as React from 'react';
import { Tailwind } from '@react-email/components';

export const aegisTailwindConfig = {
  theme: {
    extend: {
      colors: {
        brand: '#00f0ff', // Cyberpunk neon cyan
        background: '#09090b', // Deep black/zinc
        surface: '#18181b', // Slightly lighter zinc
        textMain: '#e4e4e7',
        textMuted: '#a1a1aa',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};

export const AegisTailwind: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Tailwind config={aegisTailwindConfig}>
      {children}
    </Tailwind>
  );
};
