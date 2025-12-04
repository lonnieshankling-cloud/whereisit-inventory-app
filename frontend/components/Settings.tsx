import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { useBackend } from "@/lib/backend";
import { theme } from "@/lib/theme";
import {
    AlertTriangle,
    Bell,
    CheckCircle2,
    Database,
    Download,
    Info,
    Moon,
    Sun,
    Trash2
} from "lucide-react";
import { useEffect, useState } from "react";

export function Settings() {
  const { toast } = useToast();
  const backend = useBackend();
  const [settings, setSettings] = useState({
    darkMode: false,
    notifications: {
      expirationReminders: true,
      lowStockAlerts: true,
      locationConfirmations: false,
      householdUpdates: true,
    },
    preferences: {
      showImagePreviews: true,
      autoSaveSearchFilters: false,
      compactView: false,
    },
  });
  const [stats, setStats] = useState({
    totalItems: 0,
    totalLocations: 0,
    totalPhotos: 0,
    storageUsed: "0 MB",
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadStats();
    loadSettings();
  }, []);

  const loadSettings = () => {
    const savedSettings = localStorage.getItem("appSettings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const saveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    localStorage.setItem("appSettings", JSON.stringify(newSettings));
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated.",
    });
  };

  const loadStats = async () => {
    try {
      const [items, locations] = await Promise.all([
        backend.item.listByPlacedStatus({ status: "all" }),
        backend.location.list(),
      ]);

      const photosCount = items.items.filter((item: any) => item.photoUrl).length;
      
      setStats({
        totalItems: items.items.length,
        totalLocations: locations.locations.length,
        totalPhotos: photosCount,
        storageUsed: `${(photosCount * 0.5).toFixed(1)} MB`, // Estimate
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const [items, locations, household] = await Promise.all([
        backend.item.listByPlacedStatus({ status: "all" }),
        backend.location.list(),
        backend.household.get(),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        household: household.household,
        items: items.items,
        locations: locations.locations,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `whereisit-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Your data has been exported successfully.",
      });
    } catch (error) {
      console.error("Failed to export data:", error);
      toast({
        title: "Export failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearCache = () => {
    localStorage.removeItem("appSettings");
    sessionStorage.clear();
    toast({
      title: "Cache cleared",
      description: "Application cache has been cleared.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Settings</h2>
        <p className="text-gray-600">Manage your app preferences and account settings</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {settings.darkMode ? (
              <Moon className="h-5 w-5" style={{ color: theme.colors.brand.primary }} />
            ) : (
              <Sun className="h-5 w-5" style={{ color: theme.colors.accent.amber }} />
            )}
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>Customize how the app looks and feels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <p className="text-sm text-gray-500">Switch between light and dark theme</p>
            </div>
            <Switch
              id="dark-mode"
              checked={settings.darkMode}
              onCheckedChange={(checked) => {
                const newSettings = { ...settings, darkMode: checked };
                saveSettings(newSettings);
                toast({
                  title: "Coming soon",
                  description: "Dark mode will be available in a future update!",
                });
              }}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="compact-view">Compact View</Label>
              <p className="text-sm text-gray-500">Show more items on screen</p>
            </div>
            <Switch
              id="compact-view"
              checked={settings.preferences.compactView}
              onCheckedChange={(checked) => {
                saveSettings({
                  ...settings,
                  preferences: { ...settings.preferences, compactView: checked },
                });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="image-previews">Image Previews</Label>
              <p className="text-sm text-gray-500">Show image thumbnails in lists</p>
            </div>
            <Switch
              id="image-previews"
              checked={settings.preferences.showImagePreviews}
              onCheckedChange={(checked) => {
                saveSettings({
                  ...settings,
                  preferences: { ...settings.preferences, showImagePreviews: checked },
                });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" style={{ color: theme.colors.brand.primary }} />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>Manage your notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="expiration-reminders">Expiration Reminders</Label>
              <p className="text-sm text-gray-500">Get notified before items expire</p>
            </div>
            <Switch
              id="expiration-reminders"
              checked={settings.notifications.expirationReminders}
              onCheckedChange={(checked) => {
                saveSettings({
                  ...settings,
                  notifications: { ...settings.notifications, expirationReminders: checked },
                });
              }}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="low-stock">Low Stock Alerts</Label>
              <p className="text-sm text-gray-500">Notify when items are running low</p>
            </div>
            <Switch
              id="low-stock"
              checked={settings.notifications.lowStockAlerts}
              onCheckedChange={(checked) => {
                saveSettings({
                  ...settings,
                  notifications: { ...settings.notifications, lowStockAlerts: checked },
                });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="location-confirmations">Location Confirmations</Label>
              <p className="text-sm text-gray-500">Remind to confirm item locations</p>
            </div>
            <Switch
              id="location-confirmations"
              checked={settings.notifications.locationConfirmations}
              onCheckedChange={(checked) => {
                saveSettings({
                  ...settings,
                  notifications: { ...settings.notifications, locationConfirmations: checked },
                });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="household-updates">Household Updates</Label>
              <p className="text-sm text-gray-500">Get notified of household changes</p>
            </div>
            <Switch
              id="household-updates"
              checked={settings.notifications.householdUpdates}
              onCheckedChange={(checked) => {
                saveSettings({
                  ...settings,
                  notifications: { ...settings.notifications, householdUpdates: checked },
                });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data & Storage */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" style={{ color: theme.colors.brand.primary }} />
            <CardTitle>Data & Storage</CardTitle>
          </div>
          <CardDescription>Manage your inventory data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="text-2xl font-bold">{stats.totalItems}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Locations</p>
              <p className="text-2xl font-bold">{stats.totalLocations}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Photos</p>
              <p className="text-2xl font-bold">{stats.totalPhotos}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Storage Used</p>
              <p className="text-2xl font-bold">{stats.storageUsed}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleExportData}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : "Export All Data"}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleClearCache}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cache
            </Button>

            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Delete All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5" style={{ color: theme.colors.brand.primary }} />
            <CardTitle>Advanced</CardTitle>
          </div>
          <CardDescription>Advanced settings and features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-save-filters">Auto-save Search Filters</Label>
              <p className="text-sm text-gray-500">Remember your search preferences</p>
            </div>
            <Switch
              id="auto-save-filters"
              checked={settings.preferences.autoSaveSearchFilters}
              onCheckedChange={(checked) => {
                saveSettings({
                  ...settings,
                  preferences: { ...settings.preferences, autoSaveSearchFilters: checked },
                });
              }}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>App Version</Label>
            <p className="text-sm text-gray-500">Version 1.0.0</p>
          </div>

          <div className="space-y-2">
            <Label>Backend Status</Label>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <p className="text-sm text-gray-500">Connected to local backend</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all your items,
              locations, and household data from the server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                toast({
                  title: "Feature not available",
                  description: "Data deletion must be performed by an administrator.",
                  variant: "destructive",
                });
              }}
            >
              Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
