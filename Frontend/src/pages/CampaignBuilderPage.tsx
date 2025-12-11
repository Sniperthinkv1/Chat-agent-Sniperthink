import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignsApi, templatesApi, phoneNumbersApi, usersApi, Template, PhoneNumber } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Save, Plus, X } from 'lucide-react'

type TriggerType = 'IMMEDIATE' | 'SCHEDULED' | 'EVENT'
type EventType = 'extraction.complete' | 'lead.statusChanged' | 'contact.tagAdded'

interface Trigger {
  type: TriggerType
  scheduled_at?: string
  event_type?: EventType
  event_config?: Record<string, unknown>
}

interface RecipientFilter {
  tags?: string[]
  exclude_tags?: string[]
  opted_in_only?: boolean
}

export default function CampaignBuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const isEdit = Boolean(id)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState('')
  const [trigger, setTrigger] = useState<Trigger>({ type: 'IMMEDIATE' })
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>({ opted_in_only: true })
  const [tagInput, setTagInput] = useState('')
  const [excludeTagInput, setExcludeTagInput] = useState('')

  // Fetch users for selection
  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.list({ limit: 100 }),
  })

  // Fetch approved templates
  const { data: templatesData } = useQuery({
    queryKey: ['templates', 'approved'],
    queryFn: () => templatesApi.list({ status: 'APPROVED', limit: 100 }),
  })

  // Fetch phone numbers
  const { data: phoneNumbersData } = useQuery({
    queryKey: ['phone-numbers', 'all'],
    queryFn: () => phoneNumbersApi.list({ limit: 100 }),
  })

  // Fetch campaign if editing
  const { data: campaignData } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsApi.get(id!),
    enabled: isEdit,
  })

  // Populate form when editing
  useEffect(() => {
    if (campaignData) {
      const c = campaignData.campaign
      setName(c.name)
      setDescription(c.description || '')
      setSelectedUserId(c.user_id)
      setSelectedTemplateId(c.template_id)
      setSelectedPhoneNumberId(c.phone_number_id)
      setRecipientFilter(c.recipient_filter || { opted_in_only: true })
      // Load triggers from campaign data
      if (campaignData.triggers && campaignData.triggers.length > 0) {
        const t = campaignData.triggers[0]
        setTrigger({
          type: t.trigger_type,
          scheduled_at: t.scheduled_at || undefined,
          event_type: t.event_type as EventType | undefined,
          event_config: t.event_config || undefined,
        })
      }
    }
  }, [campaignData])

  // Reset phone number when user changes
  useEffect(() => {
    if (!isEdit) {
      setSelectedPhoneNumberId('')
    }
  }, [selectedUserId, isEdit])

  const createMutation = useMutation({
    mutationFn: (data: {
      user_id: string
      name: string
      description?: string
      template_id: string
      phone_number_id: string
      recipient_filter?: RecipientFilter
      triggers?: Array<{
        trigger_type: TriggerType
        scheduled_at?: string
        event_type?: string
        event_config?: Record<string, unknown>
      }>
    }) => campaignsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast({ title: 'Campaign created successfully' })
      navigate('/campaigns')
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to create campaign' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !selectedUserId || !selectedTemplateId || !selectedPhoneNumberId) {
      toast({ variant: 'destructive', title: 'Please fill in all required fields' })
      return
    }
    createMutation.mutate({
      user_id: selectedUserId,
      name,
      description: description || undefined,
      template_id: selectedTemplateId,
      phone_number_id: selectedPhoneNumberId,
      recipient_filter: recipientFilter,
      triggers: [{
        trigger_type: trigger.type,
        scheduled_at: trigger.scheduled_at,
        event_type: trigger.event_type,
        event_config: trigger.event_config,
      }],
    })
  }

  const handleAddTag = () => {
    if (tagInput && !recipientFilter.tags?.includes(tagInput)) {
      setRecipientFilter((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput],
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setRecipientFilter((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag),
    }))
  }

  const handleAddExcludeTag = () => {
    if (excludeTagInput && !recipientFilter.exclude_tags?.includes(excludeTagInput)) {
      setRecipientFilter((prev) => ({
        ...prev,
        exclude_tags: [...(prev.exclude_tags || []), excludeTagInput],
      }))
      setExcludeTagInput('')
    }
  }

  const handleRemoveExcludeTag = (tag: string) => {
    setRecipientFilter((prev) => ({
      ...prev,
      exclude_tags: prev.exclude_tags?.filter((t) => t !== tag),
    }))
  }

  const templates = templatesData?.data || []
  const allPhoneNumbers = phoneNumbersData?.data || []
  const users = usersData?.data || []
  
  // Filter phone numbers by selected user
  const phoneNumbers = selectedUserId 
    ? allPhoneNumbers.filter((pn) => pn.user_id === selectedUserId)
    : allPhoneNumbers

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isEdit ? 'Edit Campaign' : 'Create Campaign'}
          </h2>
          <p className="text-muted-foreground">Configure campaign settings and triggers</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Campaign name and description</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">User *</label>
                <select
                  className="w-full px-3 py-2 rounded-md border"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">Select a user...</option>
                  {users.map((user) => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.email} ({user.company_name || user.user_id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Campaign Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter campaign name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full px-3 py-2 rounded-md border min-h-[80px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional campaign description"
                />
              </div>
            </CardContent>
          </Card>

          {/* Template & Phone Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Template & Channel</CardTitle>
              <CardDescription>Select template and phone number</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Template *</label>
                <select
                  className="w-full px-3 py-2 rounded-md border"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  <option value="">Select a template...</option>
                  {templates.map((template: Template) => (
                    <option key={template.template_id} value={template.template_id}>
                      {template.name} ({template.category})
                    </option>
                  ))}
                </select>
                {templates.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No approved templates available. Create and submit a template first.
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number *</label>
                <select
                  className="w-full px-3 py-2 rounded-md border"
                  value={selectedPhoneNumberId}
                  onChange={(e) => setSelectedPhoneNumberId(e.target.value)}
                  disabled={!selectedUserId}
                >
                  <option value="">{selectedUserId ? 'Select a phone number...' : 'Select a user first...'}</option>
                  {phoneNumbers.map((pn: PhoneNumber) => (
                    <option key={pn.id} value={pn.id}>
                      {pn.display_name || pn.meta_phone_number_id} ({pn.platform})
                    </option>
                  ))}
                </select>
                {selectedUserId && phoneNumbers.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No phone numbers configured for this user.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Trigger Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Trigger</CardTitle>
              <CardDescription>When should this campaign run?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Trigger Type</label>
                <select
                  className="w-full px-3 py-2 rounded-md border"
                  value={trigger.type}
                  onChange={(e) =>
                    setTrigger({ type: e.target.value as TriggerType })
                  }
                >
                  <option value="IMMEDIATE">Immediate (start manually)</option>
                  <option value="SCHEDULED">Scheduled (run at specific time)</option>
                  <option value="EVENT">Event-based (triggered by events)</option>
                </select>
              </div>

              {trigger.type === 'SCHEDULED' && (
                <div>
                  <label className="text-sm font-medium">Schedule Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={trigger.scheduled_at || ''}
                    onChange={(e) =>
                      setTrigger((prev) => ({ ...prev, scheduled_at: e.target.value }))
                    }
                  />
                </div>
              )}

              {trigger.type === 'EVENT' && (
                <div>
                  <label className="text-sm font-medium">Event Type</label>
                  <select
                    className="w-full px-3 py-2 rounded-md border"
                    value={trigger.event_type || ''}
                    onChange={(e) =>
                      setTrigger((prev) => ({
                        ...prev,
                        event_type: e.target.value as EventType,
                      }))
                    }
                  >
                    <option value="">Select event...</option>
                    <option value="extraction.complete">Extraction Complete</option>
                    <option value="lead.statusChanged">Lead Status Changed</option>
                    <option value="contact.tagAdded">Contact Tag Added</option>
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recipient Filter */}
          <Card>
            <CardHeader>
              <CardTitle>Recipients</CardTitle>
              <CardDescription>Filter who receives this campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="opted_in_only"
                  checked={recipientFilter.opted_in_only !== false}
                  onChange={(e) =>
                    setRecipientFilter((prev) => ({
                      ...prev,
                      opted_in_only: e.target.checked,
                    }))
                  }
                />
                <label htmlFor="opted_in_only" className="text-sm">
                  Only send to opted-in contacts
                </label>
              </div>

              <div>
                <label className="text-sm font-medium">Include Tags (OR)</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add tag..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {recipientFilter.tags && recipientFilter.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {recipientFilter.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                      >
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Exclude Tags</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={excludeTagInput}
                    onChange={(e) => setExcludeTagInput(e.target.value)}
                    placeholder="Add exclude tag..."
                    onKeyDown={(e) =>
                      e.key === 'Enter' && (e.preventDefault(), handleAddExcludeTag())
                    }
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddExcludeTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {recipientFilter.exclude_tags && recipientFilter.exclude_tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {recipientFilter.exclude_tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-1 rounded"
                      >
                        {tag}
                        <button type="button" onClick={() => handleRemoveExcludeTag(tag)}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/campaigns')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {isEdit ? 'Update Campaign' : 'Create Campaign'}
          </Button>
        </div>
      </form>
    </div>
  )
}
