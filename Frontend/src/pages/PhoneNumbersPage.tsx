import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { phoneNumbersApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Search, Edit2 } from 'lucide-react'

export default function PhoneNumbersPage() {
  const [search, setSearch] = useState('')
  const [page, _setPage] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ waba_id: '', daily_message_limit: '', tier: '' })
  const limit = 20
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['phone-numbers', page],
    queryFn: () => phoneNumbersApi.list({ limit, offset: page * limit }),
  })

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: any }) => phoneNumbersApi.update(params.id, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone-numbers'] })
      setEditingId(null)
      toast({ title: 'Phone number updated successfully' })
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to update phone number' })
    },
  })

  const filteredData = data?.data.filter(
    (phone) =>
      phone.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      phone.meta_phone_number_id.includes(search)
  ) || []

  const handleEdit = (phone: any) => {
    setEditingId(phone.id)
    setEditData({
      waba_id: phone.waba_id || '',
      daily_message_limit: phone.daily_message_limit?.toString() || '',
      tier: phone.tier || '',
    })
  }

  const handleSave = () => {
    if (!editingId) return
    updateMutation.mutate({
      id: editingId,
      data: {
        waba_id: editData.waba_id || undefined,
        daily_message_limit: editData.daily_message_limit ? parseInt(editData.daily_message_limit) : undefined,
        tier: editData.tier || undefined,
      },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Phone Numbers</h2>
        <p className="text-muted-foreground">Manage WhatsApp, Instagram, and Webchat channels</p>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search phone numbers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">Display Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Platform</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">WABA ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Daily Limit</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Tier</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((phone) => (
                    <tr key={phone.id} className="border-b">
                      <td className="px-4 py-3 text-sm">
                        {phone.display_name || phone.meta_phone_number_id}
                      </td>
                      <td className="px-4 py-3 text-sm capitalize">{phone.platform}</td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === phone.id ? (
                          <Input
                            value={editData.waba_id}
                            onChange={(e) => setEditData({ ...editData, waba_id: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          phone.waba_id || '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === phone.id ? (
                          <Input
                            type="number"
                            value={editData.daily_message_limit}
                            onChange={(e) => setEditData({ ...editData, daily_message_limit: e.target.value })}
                            className="h-8 w-24"
                          />
                        ) : (
                          phone.daily_message_limit?.toLocaleString() || '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === phone.id ? (
                          <select
                            value={editData.tier}
                            onChange={(e) => setEditData({ ...editData, tier: e.target.value })}
                            className="h-8 rounded border px-2"
                          >
                            <option value="">Select tier</option>
                            <option value="TIER_1K">TIER_1K</option>
                            <option value="TIER_10K">TIER_10K</option>
                            <option value="TIER_100K">TIER_100K</option>
                            <option value="TIER_UNLIMITED">TIER_UNLIMITED</option>
                          </select>
                        ) : (
                          phone.tier || '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{phone.user_email || phone.user_id}</td>
                      <td className="px-4 py-3 text-right">
                        {editingId === phone.id ? (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" onClick={handleSave}>Save</Button>
                            <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(phone)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
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
