import { Card } from "@/components/ui/card";

export function Settings() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>
      
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
        <p className="text-gray-600">
          Manage your account settings and preferences here.
        </p>
      </Card>
      
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Notifications</h3>
        <p className="text-gray-600">
          Configure your notification preferences.
        </p>
      </Card>
      
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Privacy</h3>
        <p className="text-gray-600">
          Manage your privacy settings and data preferences.
        </p>
      </Card>
    </div>
  );
}
