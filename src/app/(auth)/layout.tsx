import { AuroraBackground } from '@/components/ui/aurora-background';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuroraBackground>
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </AuroraBackground>
  );
}
