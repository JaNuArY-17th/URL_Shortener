import { AuthenticatedHeader } from "@/components/AuthenticatedHeader";

const Settings = () => {
  return (
    <div className="min-h-screen bg-background">
      <AuthenticatedHeader />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        <p className="text-muted-foreground">Settings page coming soon.</p>
      </div>
    </div>
  );
};

export default Settings; 