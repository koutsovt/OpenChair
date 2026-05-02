'use client';

import { Scissors, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { CountUp } from '@/components/ui/count-up';

interface ClientStatsProps {
  totalVisits: number;
  totalSpendFormatted: string;
  totalSpend: number;
  lastVisitFormatted: string | null;
  noShowCount: number;
}

export function ClientStats({
  totalVisits,
  totalSpendFormatted,
  totalSpend,
  lastVisitFormatted,
  noShowCount,
}: ClientStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SpotlightCard>
        <CardContent className="flex items-center gap-3 py-4">
          <Scissors className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold">
              <CountUp to={totalVisits} duration={1.5} />
            </p>
            <p className="text-xs text-muted-foreground">Total Visits</p>
          </div>
        </CardContent>
      </SpotlightCard>

      <SpotlightCard>
        <CardContent className="flex items-center gap-3 py-4">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold">
              {totalSpend > 0 ? (
                <CountUp to={totalSpend} duration={2} prefix="$" />
              ) : (
                totalSpendFormatted
              )}
            </p>
            <p className="text-xs text-muted-foreground">Total Spend</p>
          </div>
        </CardContent>
      </SpotlightCard>

      <SpotlightCard>
        <CardContent className="flex items-center gap-3 py-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold">{lastVisitFormatted ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Last Visit</p>
          </div>
        </CardContent>
      </SpotlightCard>

      <SpotlightCard className={noShowCount >= 3 ? 'border-orange-300' : ''}>
        <CardContent className="flex items-center gap-3 py-4">
          <AlertTriangle
            className={`h-5 w-5 ${noShowCount >= 3 ? 'text-orange-500' : 'text-muted-foreground'}`}
          />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">
                <CountUp to={noShowCount} duration={1.5} />
              </p>
              {noShowCount >= 3 && (
                <Badge variant="secondary" className="bg-orange-100 text-xs text-orange-800">
                  Frequent
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">No-Shows</p>
          </div>
        </CardContent>
      </SpotlightCard>
    </div>
  );
}
