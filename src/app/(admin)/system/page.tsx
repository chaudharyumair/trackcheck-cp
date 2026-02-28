"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
import { KpiCard } from "@/components/admin/kpi-card";
import { trpc } from "@/lib/trpc/react";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Cpu,
  Database,
  HardDrive,
  Radio,
  Shield,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

const KILL_SWITCH_KEYS = [
  "disable_ai_globally",
  "disable_extension_api",
  "disable_ga4_sync",
] as const;

const KILL_SWITCH_CONFIG: Record<
  (typeof KILL_SWITCH_KEYS)[number],
  { label: string; description: string }
> = {
  disable_ai_globally: {
    label: "Disable AI Globally",
    description: "Immediately disable all AI features across the platform",
  },
  disable_extension_api: {
    label: "Disable Extension API",
    description: "Block all extension API calls",
  },
  disable_ga4_sync: {
    label: "Disable GA4 Sync",
    description: "Stop GA4 data synchronization",
  },
};

export default function SystemPage() {
  const [confirmDisable, setConfirmDisable] = useState<{
    flagId: string;
    key: (typeof KILL_SWITCH_KEYS)[number];
    newEnabled: boolean;
  } | null>(null);

  const { data: health, isLoading } = trpc.system.getHealth.useQuery();
  const { data: flagsData, refetch: refetchFlags } =
    trpc.featureFlags.list.useQuery();
  const utils = trpc.useUtils();
  const updateFlag = trpc.featureFlags.update.useMutation({
    onSuccess: () => {
      utils.featureFlags.list.invalidate();
      refetchFlags();
      setConfirmDisable(null);
      toast.success("Feature flag updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const killSwitchFlags = (flagsData?.data ?? []).filter((f) =>
    KILL_SWITCH_KEYS.includes(f.key as (typeof KILL_SWITCH_KEYS)[number])
  );

  const handleKillSwitchToggle = (
    flagId: string,
    key: (typeof KILL_SWITCH_KEYS)[number],
    currentEnabled: boolean,
    newEnabled: boolean
  ) => {
    if (newEnabled) {
      updateFlag.mutate({ id: flagId, enabled: true });
    } else {
      setConfirmDisable({ flagId, key, newEnabled: false });
    }
  };

  const handleConfirmDisable = () => {
    if (confirmDisable) {
      updateFlag.mutate({ id: confirmDisable.flagId, enabled: false });
      setConfirmDisable(null);
    }
  };

  const dbSize = health?.dbSize ?? 0;
  const storageMb =
    (health as { storageUsageMb?: number })?.storageUsageMb ?? 0;
  const apiResponseMs =
    (health as { apiResponseTimeMs?: number })?.apiResponseTimeMs ?? 0;
  const trpcErrorRate =
    (health as { trpcErrorRate?: number })?.trpcErrorRate ?? 0;
  const aiFailureRate =
    (health as { aiEndpointFailureRate?: number })?.aiEndpointFailureRate ?? 0;
  const extensionCalls =
    (health as { extensionApiCalls?: number })?.extensionApiCalls ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">System Health</h1>
        <p className="text-muted-foreground">
          Platform infrastructure monitoring
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          title="API Response Time"
          value={isLoading ? "—" : `${apiResponseMs} ms`}
          icon={<Activity />}
          loading={isLoading}
        />
        <KpiCard
          title="tRPC Error Rate"
          value={isLoading ? "—" : `${trpcErrorRate}%`}
          icon={<Shield />}
          loading={isLoading}
        />
        <KpiCard
          title="AI Endpoint Failure Rate"
          value={isLoading ? "—" : `${aiFailureRate}%`}
          icon={<Cpu />}
          loading={isLoading}
        />
        <KpiCard
          title="Extension API Calls"
          value={isLoading ? "—" : formatNumber(extensionCalls)}
          icon={<Radio />}
          loading={isLoading}
        />
        <KpiCard
          title="Database Size"
          value={
            isLoading
              ? "—"
              : dbSize >= 1024
                ? `${(dbSize / 1024).toFixed(1)} GB`
                : `${dbSize} MB`
          }
          icon={<Database />}
          loading={isLoading}
        />
        <KpiCard
          title="Storage Usage"
          value={
            isLoading
              ? "—"
              : storageMb >= 1024
                ? `${(storageMb / 1024).toFixed(1)} GB`
                : `${storageMb} MB`
          }
          icon={<HardDrive />}
          loading={isLoading}
        />
      </div>

      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            <CardTitle>Emergency Controls</CardTitle>
          </div>
          <CardDescription>
            Use these controls to immediately disable platform features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {killSwitchFlags.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No emergency kill switch flags found. Create feature flags with
              keys: disable_ai_globally, disable_extension_api, disable_ga4_sync
            </p>
          ) : (
            killSwitchFlags.map((flag) => {
              const config =
                KILL_SWITCH_CONFIG[
                  flag.key as (typeof KILL_SWITCH_KEYS)[number]
                ];
              if (!config) return null;
              return (
                <div key={flag.id}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="font-medium">{config.label}</p>
                      <p className="text-muted-foreground text-sm">
                        {config.description}
                      </p>
                    </div>
                    <Switch
                      checked={!!flag.enabled}
                      onCheckedChange={(checked) =>
                        handleKillSwitchToggle(
                          flag.id,
                          flag.key as (typeof KILL_SWITCH_KEYS)[number],
                          !!flag.enabled,
                          checked
                        )
                      }
                    />
                  </div>
                  <Separator className="mt-4" />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!confirmDisable}
        onOpenChange={(open) => !open && setConfirmDisable(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm disable</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDisable
                ? `Are you sure you want to turn OFF the kill switch for ${
                    KILL_SWITCH_CONFIG[confirmDisable.key]?.label ??
                    "this feature"
                  }? This will re-enable the feature.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDisable}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Turn OFF
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
