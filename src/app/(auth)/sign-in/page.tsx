'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDemoMode } from '@/hooks/useDemoMode';

const DEMO_EMAIL = 'demo@openchair.dev';
const DEMO_PASSWORD = 'demo1234';

export default function SignInPage() {
  const [isPending, setIsPending] = useState(false);
  const [demoMode, setDemoMode] = useDemoMode();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const email = demoMode ? DEMO_EMAIL : (formData.get('email') as string);
    const password = demoMode ? DEMO_PASSWORD : (formData.get('password') as string);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Invalid email or password');
        setIsPending(false);
      } else {
        window.location.href = '/dashboard';
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
      setIsPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Sign In</CardTitle>
        <CardDescription>Sign in to your OpenChair account</CardDescription>
      </CardHeader>

      {demoMode && (
        <div className="mx-6 mb-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">Demo mode</span> — credentials prefilled.{' '}
          <span className="opacity-75">({DEMO_EMAIL})</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={demoMode ? DEMO_EMAIL : undefined}
              readOnly={demoMode}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={demoMode ? DEMO_PASSWORD : undefined}
              readOnly={demoMode}
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              role="switch"
              aria-checked={demoMode}
              onClick={() => setDemoMode(!demoMode)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                demoMode ? 'bg-amber-400' : 'bg-input'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                  demoMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <Label
              htmlFor="demo-toggle"
              className="cursor-pointer select-none text-sm text-muted-foreground"
              onClick={() => setDemoMode(!demoMode)}
            >
              Demo mode
            </Label>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Signing in…' : 'Sign In'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/sign-up" className="text-primary underline-offset-4 hover:underline">
              Sign Up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
