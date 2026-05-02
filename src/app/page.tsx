import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { BlurText } from '@/components/ui/blur-text';
import { GradientText } from '@/components/ui/gradient-text';
import { ShinyText } from '@/components/ui/shiny-text';

export default function HomePage() {
  return (
    <AuroraBackground>
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
        <BlurText text="OpenChair" className="text-6xl font-bold tracking-tight" delay={150} />
        <ShinyText
          text="AI-native salon operating system"
          className="text-xl"
          color="#71717a"
          shineColor="#18181b"
          speed={1.5}
        />
        <Button asChild size="lg" className="mt-4">
          <Link href="/sign-in">
            <GradientText className="text-base font-semibold">Get Started</GradientText>
          </Link>
        </Button>
      </div>
    </AuroraBackground>
  );
}
