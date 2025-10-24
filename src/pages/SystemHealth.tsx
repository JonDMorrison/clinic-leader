import { SystemHealthCard } from "@/components/tests/SystemHealthCard";
import { OnboardingFlowCard } from "@/components/tests/OnboardingFlowCard";
import { KpiIntegrityCard } from "@/components/tests/KpiIntegrityCard";

const SystemHealth = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
          System Health & Testing
        </h1>
        <p className="text-muted-foreground text-lg">
          Monitor your application's health and test critical workflows
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemHealthCard />
        <OnboardingFlowCard />
      </div>

      <div className="mt-6">
        <KpiIntegrityCard />
      </div>
    </div>
  );
};

export default SystemHealth;
