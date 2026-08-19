import Link from "next/link";
import { getCurrentTenant } from "@/lib/tenant/current";
import { prisma } from "@/lib/db/client";
import { getMonthlyConversationUsage } from "@/lib/billing/status";
import { channelStatusTone } from "@/lib/billing/status-tone";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/dashboard/Card";
import { Badge } from "@/components/dashboard/Badge";
import { IconTile } from "@/components/dashboard/IconTile";
import {
  MessageSquareIcon,
  UserPlusIcon,
  QuestionCircleIcon,
  CalendarIcon,
  GlobeIcon,
  MessageCircleIcon,
  CameraIcon,
} from "@/components/dashboard/icons";

const CHANNELS = [
  { key: "websiteEnabled", statusKey: "status", label: "Website", href: "/install", icon: <GlobeIcon className="h-4 w-4" />, tone: "accent" as const },
  { key: "whatsappEnabled", statusKey: "whatsappStatus", label: "WhatsApp", href: "/whatsapp", icon: <MessageCircleIcon className="h-4 w-4" />, tone: "success" as const },
  { key: "instagramEnabled", statusKey: "instagramStatus", label: "Instagram", href: "/instagram", icon: <CameraIcon className="h-4 w-4" />, tone: "instagram" as const },
] as const;

export default async function DashboardHomePage() {
  const { tenant } = await getCurrentTenant();

  const [conversationsThisMonth, leadCount, unansweredCount, pendingAppointments] = await Promise.all([
    getMonthlyConversationUsage(tenant.id),
    prisma.lead.count({ where: { tenantId: tenant.id } }),
    prisma.conversation.count({ where: { tenantId: tenant.id, answered: false } }),
    prisma.appointment.count({ where: { tenantId: tenant.id, status: "requested" } }),
  ]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Welcome back, {tenant.name}</h1>
      <p className="mt-1 text-sm text-muted">Here&apos;s how your chatbot is doing.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Conversations this month"
          value={conversationsThisMonth}
          href="/usage"
          icon={<MessageSquareIcon className="h-[1.15rem] w-[1.15rem]" />}
          tone="accent"
        />
        <StatCard
          label="Leads"
          value={leadCount}
          href="/leads"
          icon={<UserPlusIcon className="h-[1.15rem] w-[1.15rem]" />}
          tone="success"
        />
        <StatCard
          label="Unanswered"
          value={unansweredCount}
          href="/unanswered"
          icon={<QuestionCircleIcon className="h-[1.15rem] w-[1.15rem]" />}
          tone="warning"
        />
        <StatCard
          label="Pending appointments"
          value={pendingAppointments}
          href="/appointments"
          icon={<CalendarIcon className="h-[1.15rem] w-[1.15rem]" />}
          tone="instagram"
        />
      </div>

      <h2 className="mt-8 font-heading text-lg font-semibold tracking-tight">Channels</h2>
      <div className="mt-3 space-y-2">
        {CHANNELS.map((channel) => {
          const enabled = tenant[channel.key];
          const status = tenant[channel.statusKey];
          const info = enabled ? channelStatusTone(status) : { label: "Off", tone: "neutral" as const };
          return (
            <Link key={channel.href} href={channel.href} className="block">
              <Card padding="md" className="flex items-center justify-between transition-colors hover:border-accent/60">
                <span className="flex items-center gap-3">
                  <IconTile icon={channel.icon} tone={channel.tone} size="sm" />
                  <span className="font-medium">{channel.label}</span>
                </span>
                <Badge tone={info.tone}>{info.label}</Badge>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
