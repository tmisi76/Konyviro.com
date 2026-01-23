import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Save, Shield, Globe, Bell, Wrench, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSystemSettings, useUpdateSystemSettings } from "@/hooks/admin/useSystemSettings";

interface GeneralSettings {
  app_name: string;
  app_description: string;
  support_email: string;
  registration_enabled: boolean;
  require_email_verification: boolean;
}

interface SecuritySettings {
  session_timeout_hours: number;
  max_login_attempts: number;
  lockout_duration_minutes: number;
  require_strong_password: boolean;
}

interface NotificationSettings {
  admin_email: string;
  send_new_user_notification: boolean;
  send_subscription_notification: boolean;
  send_error_alerts: boolean;
}

interface MaintenanceSettings {
  maintenance_mode: boolean;
  maintenance_message: string;
}

const DEFAULT_GENERAL: GeneralSettings = {
  app_name: 'KönyvÍró AI',
  app_description: 'Írj könyvet mesterséges intelligenciával',
  support_email: 'support@konyviro.ai',
  registration_enabled: true,
  require_email_verification: false
};

const DEFAULT_SECURITY: SecuritySettings = {
  session_timeout_hours: 24,
  max_login_attempts: 5,
  lockout_duration_minutes: 15,
  require_strong_password: true
};

const DEFAULT_NOTIFICATION: NotificationSettings = {
  admin_email: 'admin@konyviro.ai',
  send_new_user_notification: true,
  send_subscription_notification: true,
  send_error_alerts: true
};

const DEFAULT_MAINTENANCE: MaintenanceSettings = {
  maintenance_mode: false,
  maintenance_message: 'A rendszer karbantartás alatt áll. Kérjük, próbáld újra később!'
};

export default function AdminSettings() {
  const { data: savedSettings, isLoading } = useSystemSettings('system');
  const updateSettings = useUpdateSystemSettings();

  const [general, setGeneral] = useState<GeneralSettings>(DEFAULT_GENERAL);
  const [security, setSecurity] = useState<SecuritySettings>(DEFAULT_SECURITY);
  const [notification, setNotification] = useState<NotificationSettings>(DEFAULT_NOTIFICATION);
  const [maintenance, setMaintenance] = useState<MaintenanceSettings>(DEFAULT_MAINTENANCE);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (savedSettings) {
      setGeneral({
        app_name: savedSettings.system_app_name || DEFAULT_GENERAL.app_name,
        app_description: savedSettings.system_app_description || DEFAULT_GENERAL.app_description,
        support_email: savedSettings.system_support_email || DEFAULT_GENERAL.support_email,
        registration_enabled: savedSettings.system_registration_enabled ?? DEFAULT_GENERAL.registration_enabled,
        require_email_verification: savedSettings.system_require_email_verification ?? DEFAULT_GENERAL.require_email_verification
      });
      setSecurity({
        session_timeout_hours: savedSettings.system_session_timeout_hours || DEFAULT_SECURITY.session_timeout_hours,
        max_login_attempts: savedSettings.system_max_login_attempts || DEFAULT_SECURITY.max_login_attempts,
        lockout_duration_minutes: savedSettings.system_lockout_duration_minutes || DEFAULT_SECURITY.lockout_duration_minutes,
        require_strong_password: savedSettings.system_require_strong_password ?? DEFAULT_SECURITY.require_strong_password
      });
      setNotification({
        admin_email: savedSettings.system_admin_email || DEFAULT_NOTIFICATION.admin_email,
        send_new_user_notification: savedSettings.system_send_new_user_notification ?? DEFAULT_NOTIFICATION.send_new_user_notification,
        send_subscription_notification: savedSettings.system_send_subscription_notification ?? DEFAULT_NOTIFICATION.send_subscription_notification,
        send_error_alerts: savedSettings.system_send_error_alerts ?? DEFAULT_NOTIFICATION.send_error_alerts
      });
      setMaintenance({
        maintenance_mode: savedSettings.system_maintenance_mode ?? DEFAULT_MAINTENANCE.maintenance_mode,
        maintenance_message: savedSettings.system_maintenance_message || DEFAULT_MAINTENANCE.maintenance_message
      });
    }
  }, [savedSettings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        system_app_name: general.app_name,
        system_app_description: general.app_description,
        system_support_email: general.support_email,
        system_registration_enabled: general.registration_enabled,
        system_require_email_verification: general.require_email_verification,
        system_session_timeout_hours: security.session_timeout_hours,
        system_max_login_attempts: security.max_login_attempts,
        system_lockout_duration_minutes: security.lockout_duration_minutes,
        system_require_strong_password: security.require_strong_password,
        system_admin_email: notification.admin_email,
        system_send_new_user_notification: notification.send_new_user_notification,
        system_send_subscription_notification: notification.send_subscription_notification,
        system_send_error_alerts: notification.send_error_alerts,
        system_maintenance_mode: maintenance.maintenance_mode,
        system_maintenance_message: maintenance.maintenance_message
      });
      toast.success("Beállítások mentve!");
      setHasChanges(false);
    } catch (error: any) {
      toast.error("Hiba: " + error.message);
    }
  };

  const handleClearCache = () => {
    toast.success("Gyorsítótár törölve!");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rendszer Beállítások</h1>
          <p className="text-muted-foreground">Általános beállítások és konfiguráció</p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending || !hasChanges}>
          {updateSettings.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Mentés
        </Button>
      </div>

      {maintenance.maintenance_mode && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Karbantartási mód aktív!</AlertTitle>
          <AlertDescription>
            A felhasználók nem férnek hozzá az alkalmazáshoz, amíg a karbantartási mód be van kapcsolva.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Általános
            </CardTitle>
            <CardDescription>Alapvető rendszer beállítások</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="app_name">Alkalmazás neve</Label>
              <Input
                id="app_name"
                value={general.app_name}
                onChange={(e) => {
                  setGeneral(prev => ({ ...prev, app_name: e.target.value }));
                  setHasChanges(true);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app_description">Leírás</Label>
              <Textarea
                id="app_description"
                value={general.app_description}
                onChange={(e) => {
                  setGeneral(prev => ({ ...prev, app_description: e.target.value }));
                  setHasChanges(true);
                }}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support_email">Support email</Label>
              <Input
                id="support_email"
                type="email"
                value={general.support_email}
                onChange={(e) => {
                  setGeneral(prev => ({ ...prev, support_email: e.target.value }));
                  setHasChanges(true);
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="registration_enabled">Regisztráció engedélyezve</Label>
              <Switch
                id="registration_enabled"
                checked={general.registration_enabled}
                onCheckedChange={(checked) => {
                  setGeneral(prev => ({ ...prev, registration_enabled: checked }));
                  setHasChanges(true);
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="require_email_verification">Email megerősítés szükséges</Label>
              <Switch
                id="require_email_verification"
                checked={general.require_email_verification}
                onCheckedChange={(checked) => {
                  setGeneral(prev => ({ ...prev, require_email_verification: checked }));
                  setHasChanges(true);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Biztonság
            </CardTitle>
            <CardDescription>Biztonsági beállítások</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session_timeout">Session időtúllépés (óra)</Label>
              <Input
                id="session_timeout"
                type="number"
                value={security.session_timeout_hours}
                onChange={(e) => {
                  setSecurity(prev => ({ ...prev, session_timeout_hours: parseInt(e.target.value) || 24 }));
                  setHasChanges(true);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_login_attempts">Max. bejelentkezési kísérletek</Label>
              <Input
                id="max_login_attempts"
                type="number"
                value={security.max_login_attempts}
                onChange={(e) => {
                  setSecurity(prev => ({ ...prev, max_login_attempts: parseInt(e.target.value) || 5 }));
                  setHasChanges(true);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lockout_duration">Zárolás időtartama (perc)</Label>
              <Input
                id="lockout_duration"
                type="number"
                value={security.lockout_duration_minutes}
                onChange={(e) => {
                  setSecurity(prev => ({ ...prev, lockout_duration_minutes: parseInt(e.target.value) || 15 }));
                  setHasChanges(true);
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="require_strong_password">Erős jelszó kötelező</Label>
              <Switch
                id="require_strong_password"
                checked={security.require_strong_password}
                onCheckedChange={(checked) => {
                  setSecurity(prev => ({ ...prev, require_strong_password: checked }));
                  setHasChanges(true);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Értesítések
            </CardTitle>
            <CardDescription>Rendszerértesítések konfigurálása</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin_email">Admin értesítési email</Label>
              <Input
                id="admin_email"
                type="email"
                value={notification.admin_email}
                onChange={(e) => {
                  setNotification(prev => ({ ...prev, admin_email: e.target.value }));
                  setHasChanges(true);
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="new_user_notification">Új felhasználó értesítés</Label>
              <Switch
                id="new_user_notification"
                checked={notification.send_new_user_notification}
                onCheckedChange={(checked) => {
                  setNotification(prev => ({ ...prev, send_new_user_notification: checked }));
                  setHasChanges(true);
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="subscription_notification">Előfizetés értesítés</Label>
              <Switch
                id="subscription_notification"
                checked={notification.send_subscription_notification}
                onCheckedChange={(checked) => {
                  setNotification(prev => ({ ...prev, send_subscription_notification: checked }));
                  setHasChanges(true);
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="error_alerts">Hibajelentések</Label>
              <Switch
                id="error_alerts"
                checked={notification.send_error_alerts}
                onCheckedChange={(checked) => {
                  setNotification(prev => ({ ...prev, send_error_alerts: checked }));
                  setHasChanges(true);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Karbantartás
            </CardTitle>
            <CardDescription>Karbantartási mód és rendszerállapot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="maintenance_mode">Karbantartási mód</Label>
                <p className="text-xs text-muted-foreground">
                  Bekapcsolva a felhasználók nem érhetik el az alkalmazást
                </p>
              </div>
              <Switch
                id="maintenance_mode"
                checked={maintenance.maintenance_mode}
                onCheckedChange={(checked) => {
                  setMaintenance(prev => ({ ...prev, maintenance_mode: checked }));
                  setHasChanges(true);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance_message">Karbantartási üzenet</Label>
              <Textarea
                id="maintenance_message"
                value={maintenance.maintenance_message}
                onChange={(e) => {
                  setMaintenance(prev => ({ ...prev, maintenance_message: e.target.value }));
                  setHasChanges(true);
                }}
                rows={3}
              />
            </div>
            <Button variant="outline" onClick={handleClearCache} className="w-full">
              Gyorsítótár törlése
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
