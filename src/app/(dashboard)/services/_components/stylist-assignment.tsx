'use client';

import { useTransition } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { assignStylistToService, removeStylistFromService } from '@/server/actions/services';

interface Stylist {
  id: string;
  name: string;
}

interface StylistAssignmentProps {
  serviceId: string;
  stylists: Stylist[];
  assignedStylistIds: string[];
}

export function StylistAssignment({
  serviceId,
  stylists,
  assignedStylistIds,
}: StylistAssignmentProps) {
  const [isPending, startTransition] = useTransition();

  function handleToggle(stylistId: string, isAssigned: boolean) {
    startTransition(async () => {
      if (isAssigned) {
        await removeStylistFromService(stylistId, serviceId);
      } else {
        await assignStylistToService(stylistId, serviceId);
      }
    });
  }

  if (stylists.length === 0) {
    return <p className="text-sm text-muted-foreground">No active stylists to assign.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Assigned Stylists</p>
      {stylists.map((stylist) => {
        const isAssigned = assignedStylistIds.includes(stylist.id);
        return (
          <div key={stylist.id} className="flex items-center gap-2">
            <Checkbox
              id={`stylist-${stylist.id}`}
              checked={isAssigned}
              disabled={isPending}
              onCheckedChange={() => handleToggle(stylist.id, isAssigned)}
            />
            <Label htmlFor={`stylist-${stylist.id}`} className="text-sm font-normal">
              {stylist.name}
            </Label>
          </div>
        );
      })}
    </div>
  );
}
