import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import {
  buildThemeCssVars,
  buildGoogleFontsUrl,
  getPresetFont,
  isPresetDark,
  type SalonTheme,
} from '@/lib/theme';
import { cn } from '@/lib/utils';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { salon: true },
  });

  if (!user) {
    redirect('/sign-in');
  }

  const initials =
    [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'U';
  const salonName = user.salon?.name ?? 'My Salon';
  const theme = (user.salon?.theme as SalonTheme) ?? null;
  const cssVars = theme ? buildThemeCssVars(theme) : '';
  const isDark = theme ? isPresetDark(theme) : false;
  const fontFamily = theme ? getPresetFont(theme) : null;

  return (
    <>
      {fontFamily && <link rel="stylesheet" href={buildGoogleFontsUrl(fontFamily)} />}
      {cssVars && (
        <style dangerouslySetInnerHTML={{ __html: `#salon-theme-scope { ${cssVars} }` }} />
      )}
      <div id="salon-theme-scope" className={cn('flex min-h-screen', isDark && 'dark')}>
        <aside className="hidden w-64 border-r bg-background lg:block">
          <div className="px-6 py-4">
            <h1 className="text-lg font-bold">OpenChair</h1>
          </div>
          <Sidebar />
        </aside>
        <div className="flex flex-1 flex-col">
          <Header
            salonName={salonName}
            userInitials={initials}
            userEmail={user.email}
            logoUrl={theme?.logoUrl || undefined}
          />
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </>
  );
}
