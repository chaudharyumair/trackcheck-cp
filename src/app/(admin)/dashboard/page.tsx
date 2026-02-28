"use client";

import { useState, useMemo } from "react";
import { subDays, startOfDay, endOfDay } from "date-fns";
import {
  Users,
  UserPlus,
  UserCheck,
  Building2,
  FolderKanban,
  Zap,
  Radio,
  GitBranch,
  Monitor,
  MousePointerClick,
  Cpu,
  DollarSign,
  CreditCard,
  TrendingUp,
  Crown,
  Briefcase,
  Gift,
} from "lucide-react";
import { DateRangePicker } from "@/components/admin/date-range-picker";
import { KpiCard } from "@/components/admin/kpi-card";
import { UserGrowthChart } from "@/components/admin/charts/user-growth";
import { RevenueTrendChart } from "@/components/admin/charts/revenue-trend";
import { PlanDistributionChart } from "@/components/admin/charts/plan-distribution";
import { AiUsageChart } from "@/components/admin/charts/ai-usage-chart";
import { QaVerificationTrendChart } from "@/components/admin/charts/qa-verification-trend";
import { trpc } from "@/lib/trpc/react";
import { formatCurrency, formatNumber } from "@/lib/utils";

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-0.5">
      <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
        {title}
      </h2>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    return {
      from: startOfDay(subDays(today, 29)),
      to: endOfDay(today),
    };
  });

  const { data, isLoading } = trpc.dashboard.getStats.useQuery({
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString(),
  });
  const { data: chartData } = trpc.dashboard.getChartData.useQuery();

  const handleDateRangeChange = (range: { from: Date; to: Date }) => {
    setDateRange(range);
  };

  const dateRangeValue = useMemo(
    () => ({ from: dateRange.from, to: dateRange.to }),
    [dateRange]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Platform Overview</h1>
          <p className="text-muted-foreground">
            Real-time platform health and metrics
          </p>
        </div>
        <DateRangePicker
          value={dateRangeValue}
          onChange={handleDateRangeChange}
        />
      </div>

      {/* Users & Organizations */}
      <div className="space-y-3">
        <SectionHeader title="Users & Organizations" description="Platform user base and organization metrics" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard
            title="Total Users"
            value={formatNumber(data?.totalUsers ?? 0)}
            icon={<Users />}
            loading={isLoading}
          />
          <KpiCard
            title="New Users"
            value={formatNumber(data?.newUsers ?? 0)}
            icon={<UserPlus />}
            loading={isLoading}
          />
          <KpiCard
            title="Active Users"
            value={formatNumber(data?.activeUsers ?? 0)}
            icon={<UserCheck />}
            loading={isLoading}
          />
          <KpiCard
            title="Total Organizations"
            value={formatNumber(data?.totalOrgs ?? 0)}
            icon={<Building2 />}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Subscription Breakdown */}
      <div className="space-y-3">
        <SectionHeader title="Subscription Breakdown" description="User distribution across subscription plans" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <KpiCard
            title="Free Tier"
            value={formatNumber(data?.planBreakdown?.free ?? 0)}
            icon={<Gift />}
            loading={isLoading}
          />
          <KpiCard
            title="Pro"
            value={formatNumber(data?.planBreakdown?.pro ?? 0)}
            icon={<Briefcase />}
            loading={isLoading}
          />
          <KpiCard
            title="Enterprise"
            value={formatNumber(data?.planBreakdown?.enterprise ?? 0)}
            icon={<Crown />}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Tracking & Events */}
      <div className="space-y-3">
        <SectionHeader title="Tracking & Events" description="Event tracking, flows, screens, and interactions" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            title="Total Projects"
            value={formatNumber(data?.totalProjects ?? 0)}
            icon={<FolderKanban />}
            loading={isLoading}
          />
          <KpiCard
            title="Total Events"
            value={formatNumber(data?.totalEvents ?? 0)}
            icon={<Zap />}
            loading={isLoading}
          />
          <KpiCard
            title="Live Events"
            value={formatNumber(data?.liveEvents ?? 0)}
            icon={<Radio />}
            loading={isLoading}
          />
          <KpiCard
            title="Total Flows"
            value={formatNumber(data?.totalFlows ?? 0)}
            icon={<GitBranch />}
            loading={isLoading}
          />
          <KpiCard
            title="Total Screens"
            value={formatNumber(data?.totalScreens ?? 0)}
            icon={<Monitor />}
            loading={isLoading}
          />
          <KpiCard
            title="Total Interactions"
            value={formatNumber(data?.totalInteractions ?? 0)}
            icon={<MousePointerClick />}
            loading={isLoading}
          />
        </div>
      </div>

      {/* AI & Revenue */}
      <div className="space-y-3">
        <SectionHeader title="AI & Revenue" description="AI usage costs, subscriptions, and revenue" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard
            title="AI Credits Used"
            value={formatNumber(data?.totalAiCreditsUsed ?? 0)}
            icon={<Cpu />}
            loading={isLoading}
          />
          <KpiCard
            title="AI Cost"
            value={formatCurrency(data?.totalAiCost ?? 0)}
            icon={<DollarSign />}
            loading={isLoading}
          />
          <KpiCard
            title="Active Subscriptions"
            value={formatNumber(data?.activeSubscriptions ?? 0)}
            icon={<CreditCard />}
            loading={isLoading}
          />
          <KpiCard
            title="Total Revenue"
            value={formatCurrency(data?.totalRevenue ?? 0)}
            icon={<TrendingUp />}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="space-y-3">
        <SectionHeader title="Trends & Analytics" description="Visual breakdown of platform activity over time" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <UserGrowthChart data={chartData?.userGrowth} />
          <RevenueTrendChart />
          <PlanDistributionChart data={data?.planBreakdown ? [
            { name: "Free", value: data.planBreakdown.free, color: "var(--chart-1)" },
            { name: "Pro", value: data.planBreakdown.pro, color: "var(--chart-2)" },
            { name: "Enterprise", value: data.planBreakdown.enterprise, color: "var(--chart-4)" },
          ] : undefined} />
          <AiUsageChart data={chartData?.aiUsageByDay} />
          <QaVerificationTrendChart data={chartData?.eventTrend} />
        </div>
      </div>
    </div>
  );
}
