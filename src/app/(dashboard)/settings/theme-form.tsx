'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { updateSalonTheme } from '@/server/actions/settings';
import { PRESETS, PRESET_IDS, hslStringToHex, type SalonTheme, type PresetId } from '@/lib/theme';

interface ThemeSettingsFormProps {
  initialTheme: SalonTheme;
}

export function ThemeSettingsForm({ initialTheme }: ThemeSettingsFormProps) {
  const [preset, setPreset] = useState<PresetId>(initialTheme.preset ?? 'clean-light');
  const [brandColor, setBrandColor] = useState(initialTheme.brandColor ?? '');
  const [logoUrl, setLogoUrl] = useState(initialTheme.logoUrl ?? '');
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const theme: SalonTheme = {
        preset,
        ...(brandColor ? { brandColor } : {}),
        ...(logoUrl ? { logoUrl } : {}),
      };
      const result = await updateSalonTheme(theme);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Theme saved');
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Preset Selection */}
      <section>
        <h2 className="mb-1 text-lg font-semibold">Choose a look</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Pick a preset that matches your salon&apos;s vibe
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {PRESET_IDS.map((id) => {
            const p = PRESETS[id];
            const selected = preset === id;
            const bg = hslStringToHex(p.colors.background);
            const fg = hslStringToHex(p.colors.foreground);
            const primary = hslStringToHex(p.colors.primary);
            const border = hslStringToHex(p.colors.border);
            const cardBg = hslStringToHex(p.colors.card);

            return (
              <Card
                key={id}
                className={cn(
                  'cursor-pointer transition-all',
                  selected ? 'ring-2 ring-primary ring-offset-2' : 'hover:shadow-md'
                )}
                onClick={() => setPreset(id)}
              >
                <CardContent className="p-0">
                  {/* Mini preview */}
                  <div
                    className="overflow-hidden rounded-t-lg px-5 pb-4 pt-5"
                    style={{
                      background: bg,
                      fontFamily: `'${p.font}', sans-serif`,
                    }}
                  >
                    <p className="mb-1 text-sm font-bold" style={{ color: fg }}>
                      Your Salon
                    </p>
                    <p
                      className="mb-3 text-[11px]"
                      style={{ color: hslStringToHex(p.colors.mutedForeground) }}
                    >
                      Cut &middot; Colour &middot; Style
                    </p>
                    <div
                      className="mb-3 rounded-md p-2.5"
                      style={{ background: cardBg, border: `1px solid ${border}` }}
                    >
                      <p className="text-xs font-medium" style={{ color: fg }}>
                        Balayage
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: hslStringToHex(p.colors.mutedForeground) }}
                      >
                        2h &middot; $180
                      </p>
                    </div>
                    <div
                      className="inline-block rounded-md px-3 py-1"
                      style={{ background: primary }}
                    >
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color: hslStringToHex(p.colors.primaryForeground) }}
                      >
                        Book Now
                      </span>
                    </div>
                  </div>
                  {/* Label */}
                  <div className="p-3">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.description} &middot; {p.font}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Brand Color Override */}
      <section>
        <h2 className="mb-1 text-lg font-semibold">Brand color</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Optional — override the accent color to match your brand
        </p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={brandColor || hslStringToHex(PRESETS[preset].colors.primary)}
            onChange={(e) => setBrandColor(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded border-0"
          />
          <span className="text-sm text-muted-foreground">
            {brandColor || 'Using preset default'}
          </span>
          {brandColor && (
            <Button variant="ghost" size="sm" onClick={() => setBrandColor('')}>
              Reset
            </Button>
          )}
        </div>
      </section>

      {/* Logo */}
      <section>
        <h2 className="mb-1 text-lg font-semibold">Logo</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Optional — shows in your dashboard header
        </p>
        <div className="max-w-md">
          <Label htmlFor="logoUrl" className="sr-only">
            Logo URL
          </Label>
          <Input
            id="logoUrl"
            type="url"
            placeholder="https://example.com/logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
        </div>
      </section>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Theme'}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setPreset('clean-light');
            setBrandColor('');
            setLogoUrl('');
          }}
        >
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
