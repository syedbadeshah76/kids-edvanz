import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { LogOut, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDocumentMeta } from "@/lib/kidz/kidz-meta";
import { useAuth } from "@/contexts/AuthContext";
import { kidzPreferenceService } from "@/services/kidz/preference.service";
import { profileService } from "@/services/kidz/profile.service";
import { getApiError } from "@/lib/api-error";
import { useLogoutFlow } from "@/hooks/useLogoutFlow";
import { LogoutConfirmModal } from "@/components/auth/LogoutConfirmModal";

export function SettingsPage() {
  useDocumentMeta(
    "Settings - EDVANZ",
    "Tune the portal preferences, notifications, and appearance.",
  );

  const { user } = useAuth();
  const {
    logoutDialogOpen,
    setLogoutDialogOpen,
    loggingOut,
    handleLogout,
    openLogoutModal,
  } = useLogoutFlow();

  const initialFallbackName = user?.name || "Emma Watson";
  const [displayName, setDisplayName] = useState(initialFallbackName);
  const [email, setEmail] = useState(user?.email || "Emma.watson@gmail.com");
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState("English");
  const [largerText, setLargerText] = useState(false);

  // Preference / Notification States (/api/kids/preference)
  const [liveReminders, setLiveReminders] = useState(true);
  const [dailyNudge, setDailyNudge] = useState(true);
  const [parentReport, setParentReport] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [saving, setSaving] = useState(false);

  // Baseline snapshot of last loaded / saved settings for dirty checking
  const [initialSettings, setInitialSettings] = useState({
    displayName: initialFallbackName,
    darkMode: false,
    liveReminders: true,
    dailyNudge: true,
    parentReport: true,
  });
  const isDisplayNameDirtyRef = useRef(false);

  const hasChanges = useMemo(() => {
    return (
      displayName.trim() !== initialSettings.displayName.trim() ||
      darkMode !== initialSettings.darkMode ||
      liveReminders !== initialSettings.liveReminders ||
      dailyNudge !== initialSettings.dailyNudge ||
      parentReport !== initialSettings.parentReport
    );
  }, [darkMode, dailyNudge, displayName, initialSettings, liveReminders, parentReport]);

  // Load profile from /api/users/me on mount
  useEffect(() => {
    let isMounted = true;
    profileService
      .getProfile()
      .then((res) => {
        if (!isMounted || !res) return;
        const u = res.data ?? res.user ?? res;
        const p = u.profile ?? u;
        const fName = p.firstName ?? u.firstName ?? "";
        const lName = p.lastName ?? u.lastName ?? "";
        const combined = [fName, lName].filter(Boolean).join(" ");
        const resolvedName =
          combined || u.displayName || u.name || initialFallbackName;

        if (!isDisplayNameDirtyRef.current) {
          setDisplayName(resolvedName);
        }
        setInitialSettings((prev) => ({
          ...prev,
          displayName: resolvedName,
        }));

        if (u.email) setEmail(u.email);
      })
      .catch((err) => {
        console.warn("Could not fetch user profile in settings:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingProfile(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialFallbackName]);

  // Load preferences from /api/kids/preference on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const prefs = await kidzPreferenceService.getPreferences();
        if (isMounted) {
          setLiveReminders(prefs.liveClassReminder);
          setDailyNudge(prefs.dailyChallengeNudge);
          setParentReport(prefs.weeklyReport);
          setInitialSettings((prev) => ({
            ...prev,
            liveReminders: prefs.liveClassReminder,
            dailyNudge: prefs.dailyChallengeNudge,
            parentReport: prefs.weeklyReport,
          }));
        }
      } catch (err) {
        console.warn("Error loading kidz preferences:", err);
      } finally {
        if (isMounted) setLoadingPrefs(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Toggle handlers that update state and auto-save
  const handleToggleLiveReminders = async (checked: boolean) => {
    setLiveReminders(checked);
    try {
      await kidzPreferenceService.updatePreferences({
        liveClassReminder: checked,
        dailyChallengeNudge: dailyNudge,
        weeklyReport: parentReport,
      });
    } catch (err) {
      console.warn("Could not auto-save live class reminder preference:", err);
    }
  };

  const handleToggleDailyNudge = async (checked: boolean) => {
    setDailyNudge(checked);
    try {
      await kidzPreferenceService.updatePreferences({
        liveClassReminder: liveReminders,
        dailyChallengeNudge: checked,
        weeklyReport: parentReport,
      });
    } catch (err) {
      console.warn("Could not auto-save daily challenge nudge preference:", err);
    }
  };

  const handleToggleParentReport = async (checked: boolean) => {
    setParentReport(checked);
    try {
      await kidzPreferenceService.updatePreferences({
        liveClassReminder: liveReminders,
        dailyChallengeNudge: dailyNudge,
        weeklyReport: checked,
      });
    } catch (err) {
      console.warn("Could not auto-save weekly parent report preference:", err);
    }
  };

  const handleSave = async () => {
    if (!hasChanges || saving || loadingPrefs || loadingProfile) return;

    const trimmedName = displayName.trim();
    const isNameModified = trimmedName !== initialSettings.displayName.trim();
    if (isNameModified && !trimmedName) {
      toast.error("Display name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      // 1. Save preferences via /api/kids/preference
      await kidzPreferenceService.updatePreferences({
        liveClassReminder: liveReminders,
        dailyChallengeNudge: dailyNudge,
        weeklyReport: parentReport,
      });

      // 2. Update profile name via /api/users/me if changed
      if (isNameModified && trimmedName) {
        const parts = trimmedName.split(/\s+/);
        await profileService.updateProfile({
          firstName: parts[0] || "",
          lastName: parts.slice(1).join(" ") || "",
        });
      }

      if (trimmedName !== displayName) {
        setDisplayName(trimmedName);
      }

      setInitialSettings({
        displayName: trimmedName || initialSettings.displayName,
        darkMode,
        liveReminders,
        dailyNudge,
        parentReport,
      });
      isDisplayNameDirtyRef.current = false;

      toast.success("Settings saved successfully!");
    } catch (error) {
      const message = getApiError(
        error,
        "Failed to save settings. Please try again.",
      );
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-16">
      {/* Header */}
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-blue-600">
          PREFERENCES
        </p>
        <h1 className="mt-1 text-3xl font-black text-slate-900 sm:text-4xl">
          Setting
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Tune the portal for your learner.
        </p>
      </div>

      {/* Card 1: Profile */}
      <section className="rounded-3xl border border-[#ddd6fe] bg-[#ede9fe]/80 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">Profile</h2>
          <Button
            asChild
            variant="link"
            className="h-auto p-0 text-xs font-bold text-blue-600 hover:underline"
          >
            <Link to="/kidz/profile/edit" className="flex items-center gap-1">
              <span>Edit Full Profile</span>
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="displayName"
              className="text-xs font-bold text-slate-800"
            >
              Display Name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => {
                isDisplayNameDirtyRef.current = true;
                setDisplayName(e.target.value);
              }}
              className="h-11 rounded-full border-none bg-white px-4 font-semibold text-slate-800 shadow-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-bold text-slate-800">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              readOnly
              disabled
              className="h-11 cursor-not-allowed rounded-full border-none bg-white/80 px-4 font-semibold text-slate-600 shadow-xs"
            />
          </div>
        </div>
      </section>

      {/* Card 2: Appearance & language */}
      <section className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">
          Appearance & language
        </h2>
        <div className="space-y-3">
          {/* Row 1 */}
          <div className="flex items-center justify-between rounded-2xl border border-[#ddd6fe] bg-[#ede9fe]/80 p-4">
            <div>
              <h3 className="text-xs font-black text-slate-900">Dark Mode</h3>
              <p className="text-[11px] font-semibold text-slate-500">
                Use the moon button in the top bar to switch instantly
              </p>
            </div>
            <Switch
              checked={darkMode}
              onCheckedChange={setDarkMode}
              className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-300 border-2 border-slate-300 data-[state=checked]:border-blue-600 shadow-sm"
            />
          </div>

          {/* Row 2 */}
          <div className="flex items-center justify-between rounded-2xl border border-[#ddd6fe] bg-[#ede9fe]/80 p-4">
            <div >
              <h3 className="text-xs font-black text-slate-900">Language</h3>
              <p className="text-[11px] font-semibold text-slate-500">
                Interface language
              </p>
            </div>
            {/* <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-800 shadow-xs focus:outline-none"
            > */}
            <div className=" font-bold"> English</div> 
              {/* <option value="Spanish">Spanish</option>
              <option value="French">French</option> */}
            {/* </select> */}
          </div>

          {/* Row 3 */}
          {/* <div className="flex items-center justify-between rounded-2xl border border-[#ddd6fe] bg-[#ede9fe]/80 p-4">
            <div>
              <h3 className="text-xs font-black text-slate-900">Larger text</h3>
              <p className="text-[11px] font-semibold text-slate-500">
                Easier reading for younger learners
              </p>
            </div>
            <Switch
              checked={largerText}
              onCheckedChange={setLargerText}
              className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-300 border-2 border-slate-300 data-[state=checked]:border-blue-600 shadow-sm"
            />
          </div> */}
        </div>
      </section>

      {/* Card 3: Notifications / Preferences */}
      <section className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">Notifications</h2>
          {loadingPrefs && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading
              preferences...
            </span>
          )}
        </div>
        <div className="space-y-3">
          {/* Row 1: Live class reminders */}
          <div className="flex items-center justify-between rounded-2xl border border-[#ddd6fe] bg-[#ede9fe]/80 p-4">
            <h3 className="text-xs font-black text-slate-900">
              Live class reminders
            </h3>
            <Switch
              checked={liveReminders}
              onCheckedChange={handleToggleLiveReminders}
              disabled={loadingPrefs}
              className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-300 border-2 border-slate-300 data-[state=checked]:border-blue-600 shadow-sm"
            />
          </div>

          {/* Row 2: Daily challenge nudge */}
          <div className="flex items-center justify-between rounded-2xl border border-[#ddd6fe] bg-[#ede9fe]/80 p-4">
            <h3 className="text-xs font-black text-slate-900">
              Daily challenge nudge
            </h3>
            <Switch
              checked={dailyNudge}
              onCheckedChange={handleToggleDailyNudge}
              disabled={loadingPrefs}
              className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-300 border-2 border-slate-300 data-[state=checked]:border-blue-600 shadow-sm"
            />
          </div>

          {/* Row 3: Weekly parent report */}
          <div className="flex items-center justify-between rounded-2xl border border-[#ddd6fe] bg-[#ede9fe]/80 p-4">
            <h3 className="text-xs font-black text-slate-900">
              Weekly parent report
            </h3>
            <Switch
              checked={parentReport}
              onCheckedChange={handleToggleParentReport}
              disabled={loadingPrefs}
              className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-300 border-2 border-slate-300 data-[state=checked]:border-blue-600 shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* Footer Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          onClick={handleSave}
          disabled={saving || loadingPrefs || loadingProfile || !hasChanges}
          className="rounded-full bg-blue-600 px-6 py-6 text-xs font-bold text-white shadow-md hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600 disabled:active:scale-100"
        >
          {saving ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
        <Button
          variant="outline"
          onClick={openLogoutModal}
          disabled={loggingOut}
          className="rounded-full border-blue-200 px-6 py-6 text-xs font-bold text-blue-600 hover:bg-blue-50 active:scale-95"
        >
          <LogOut className="mr-1.5 size-4 text-blue-600" /> Log Out
        </Button>
      </div>

      <LogoutConfirmModal
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={handleLogout}
        loading={loggingOut}
      />
    </div>
  );
}

export const KidzSettings = SettingsPage;
export default KidzSettings;
