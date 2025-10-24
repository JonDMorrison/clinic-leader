import { SystemHealthCard } from "@/components/tests/SystemHealthCard";

const SystemHealth = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
          System Health
        </h1>
        <p className="text-muted-foreground text-lg">
          Monitor your application's health and connectivity
        </p>
      </div>

      <SystemHealthCard />
    </div>
  );
};

export default SystemHealth;
