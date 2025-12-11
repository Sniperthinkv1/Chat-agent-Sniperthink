import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  Phone,
  Bot,
  MessageSquare,
  FileText,
  Contact,
  Megaphone,
  Activity,
} from 'lucide-react'

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Failed to load dashboard data</p>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      description: 'Registered users',
    },
    {
      title: 'Phone Numbers',
      value: stats?.totalPhoneNumbers || 0,
      icon: Phone,
      description: 'Connected channels',
    },
    {
      title: 'Agents',
      value: stats?.totalAgents || 0,
      icon: Bot,
      description: 'Active AI agents',
    },
    {
      title: 'Conversations',
      value: stats?.totalConversations || 0,
      icon: MessageSquare,
      description: `${stats?.activeConversations || 0} active`,
    },
    {
      title: 'Messages',
      value: stats?.totalMessages || 0,
      icon: Activity,
      description: 'Total messages',
    },
    {
      title: 'Templates',
      value: stats?.totalTemplates || 0,
      icon: FileText,
      description: `${stats?.approvedTemplates || 0} approved`,
    },
    {
      title: 'Contacts',
      value: stats?.totalContacts || 0,
      icon: Contact,
      description: 'Total contacts',
    },
    {
      title: 'Campaigns',
      value: stats?.totalCampaigns || 0,
      icon: Megaphone,
      description: `${stats?.runningCampaigns || 0} running`,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your WhatsApp template management system
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
