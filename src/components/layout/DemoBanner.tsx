/**
 * Shown at the top of every dashboard page when the signed-in user is the
 * demo account. Reminds prospects that data resets nightly.
 */

const DEMO_EMAIL = 'demo@openchair.dev';

interface DemoBannerProps {
  userEmail: string;
}

export function DemoBanner({ userEmail }: DemoBannerProps) {
  if (userEmail !== DEMO_EMAIL) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-400 px-4 py-1.5 text-xs font-medium text-amber-950">
      <span>🎭</span>
      <span>
        Demo mode — data resets nightly.{' '}
        <a href="/sign-up" className="underline underline-offset-2 hover:opacity-80">
          Sign up
        </a>{' '}
        to get your own salon.
      </span>
    </div>
  );
}
