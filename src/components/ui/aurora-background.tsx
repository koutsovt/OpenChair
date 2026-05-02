'use client';

import { cn } from '@/lib/utils';

interface AuroraBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function AuroraBackground({ children, className }: AuroraBackgroundProps) {
  return (
    <div className={cn('relative min-h-screen overflow-hidden bg-background', className)}>
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(102, 126, 234, 0.4) 0%, transparent 70%)',
            filter: 'blur(60px)',
            animation: 'aurora-1 8s ease-in-out infinite',
            mixBlendMode: 'multiply',
          }}
        />
        <div
          className="absolute right-1/4 top-1/3 h-96 w-96 rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(118, 75, 162, 0.4) 0%, transparent 70%)',
            filter: 'blur(60px)',
            animation: 'aurora-2 10s ease-in-out infinite',
            mixBlendMode: 'multiply',
          }}
        />
        <div
          className="absolute bottom-1/4 left-1/3 h-96 w-96 rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(240, 147, 251, 0.4) 0%, transparent 70%)',
            filter: 'blur(60px)',
            animation: 'aurora-3 12s ease-in-out infinite',
            mixBlendMode: 'multiply',
          }}
        />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
