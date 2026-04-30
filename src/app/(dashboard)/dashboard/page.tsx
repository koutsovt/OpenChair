import { getAuthenticatedSalon } from '@/server/auth';

export default async function DashboardPage() {
  const salon = await getAuthenticatedSalon();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Welcome to OpenChair</h1>
      <p className="text-muted-foreground">
        Managing <span className="font-medium text-foreground">{salon.name}</span>
      </p>
    </div>
  );
}
