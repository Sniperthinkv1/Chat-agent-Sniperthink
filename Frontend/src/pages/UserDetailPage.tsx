import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Phone, Bot, CreditCard } from 'lucide-react'

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => usersApi.get(userId!),
    enabled: !!userId,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading user details...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Failed to load user details</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </Link>
      </div>

      <div>
        <h2 className="text-3xl font-bold tracking-tight">{data.email}</h2>
        <p className="text-muted-foreground">User ID: {data.user_id}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.remainingCredits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Remaining balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Phone Numbers</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.phoneNumbers.length}</div>
            <p className="text-xs text-muted-foreground">Connected channels</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.agents.length}</div>
            <p className="text-xs text-muted-foreground">AI agents</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Phone Numbers</CardTitle>
            <CardDescription>Connected WhatsApp/Instagram channels</CardDescription>
          </CardHeader>
          <CardContent>
            {data.phoneNumbers.length === 0 ? (
              <p className="text-muted-foreground">No phone numbers connected</p>
            ) : (
              <div className="space-y-2">
                {data.phoneNumbers.map((phone) => (
                  <div key={phone.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{phone.display_name || phone.meta_phone_number_id}</p>
                      <p className="text-sm text-muted-foreground capitalize">{phone.platform}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted">
                      {phone.tier || 'No tier'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agents</CardTitle>
            <CardDescription>AI agents linked to phone numbers</CardDescription>
          </CardHeader>
          <CardContent>
            {data.agents.length === 0 ? (
              <p className="text-muted-foreground">No agents created</p>
            ) : (
              <div className="space-y-2">
                {data.agents.map((agent) => (
                  <div key={agent.agent_id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">{agent.agent_id}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Company</dt>
              <dd className="text-sm">{data.company_name || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created</dt>
              <dd className="text-sm">{new Date(data.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
              <dd className="text-sm">{new Date(data.updated_at).toLocaleString()}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
