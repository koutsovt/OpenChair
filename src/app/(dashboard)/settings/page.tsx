import { getAuthenticatedSalon } from '@/server/auth';
import { ThemeSettingsForm } from './theme-form';
import { PRESET_IDS, PRESETS, buildGoogleFontsUrl, type SalonTheme } from '@/lib/theme';

// Deduplicate fonts across all presets
const PRESET_FONTS = Array.from(new Set(PRESET_IDS.map((id) => PRESETS[id].font)));

export default async function SettingsPage() {
  const salon = await getAuthenticatedSalon();
  const theme: SalonTheme = (salon.theme as SalonTheme) ?? { preset: 'clean-light' };

  return (
    <>
      {/* Preload all preset fonts server-side so previews render with the correct typeface */}
      {PRESET_FONTS.map((font) => (
        <link key={font} rel="stylesheet" href={buildGoogleFontsUrl(font)} />
      ))}
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Customize your salon&apos;s look</p>
        </div>
        <ThemeSettingsForm initialTheme={theme} />
      </div>
    </>
  );
}
