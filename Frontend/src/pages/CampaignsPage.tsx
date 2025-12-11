import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignsApi, Campaign } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Search, Plus, Play, Pause, StopCircle, Trash2, Eye } from 'lucide-react'

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  RUNNING: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-purple-100 text-purple-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  FAILED: 'bg-red-100 text-red-800',
}

export default function CampaignsPage() {
  const [search, setSearch] = useState('')
  const [page, _setPage] = useState(0)
  const limit = 20
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', page],
    queryFn: () => campaignsApi.list({ limit, offset: page * limit }),
  })

  const startMutation = useMutation({
    mutationFn: campaignsApi.start,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast({ title: 'Campaign started' })
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to start campaign' })
    },
  })

  const pauseMutation = useMutation({
    mutationFn: campaignsApi.pause,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast({ title: 'Campaign paused' })
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to pause campaign' })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: campaignsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast({ title: 'Campaign cancelled' })
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to cancel campaign' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: campaignsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast({ title: 'Campaign deleted' })
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to delete campaign' })
    },
  })

  const filteredData = data?.data.filter(
    (campaign) => campaign.name.toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Campaigns</h2>
          <p className="text-muted-foreground">Manage template message campaigns</p>
        </div>
        <Link to="/campaigns/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No campaigns found</p>
              <Link to="/campaigns/new">
                <Button className="mt-4">Create your first campaign</Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Progress</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((campaign: Campaign) => (
                    <tr key={campaign.campaign_id} className="border-b">
                      <td className="px-4 py-3">
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">{campaign.description || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${statusColors[campaign.status]}`}>
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                            <div
                              className="h-full bg-primary"
                              style={{
                                width: `${campaign.total_recipients > 0
                                  ? ((campaign.sent_count + campaign.failed_count) / campaign.total_recipients) * 100
                                  : 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs">
                            {campaign.sent_count}/{campaign.total_recipients}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/campaigns/${campaign.campaign_id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          {campaign.status === 'DRAFT' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startMutation.mutate(campaign.campaign_id)}
                            >
                              <Play className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {campaign.status === 'RUNNING' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => pauseMutation.mutate(campaign.campaign_id)}
                            >
                              <Pause className="h-4 w-4 text-yellow-600" />
                            </Button>
                          )}
                          {campaign.status === 'PAUSED' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => campaignsApi.resume(campaign.campaign_id)}
                              >
                                <Play className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelMutation.mutate(campaign.campaign_id)}
                              >
                                <StopCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          {['DRAFT', 'CANCELLED', 'COMPLETED', 'FAILED'].includes(campaign.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this campaign?')) {
                                  deleteMutation.mutate(campaign.campaign_id)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
