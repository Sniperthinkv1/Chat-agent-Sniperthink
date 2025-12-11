import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { templatesApi, usersApi, phoneNumbersApi, TemplateComponent, TemplateVariable } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Plus, Trash2, Save, Send } from 'lucide-react'

export default function TemplateBuilderPage() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const isEditing = !!templateId

  // Form state
  const [name, setName] = useState('')
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING')
  const [userId, setUserId] = useState('')
  const [phoneNumberId, setPhoneNumberId] = useState('')
  const [components, setComponents] = useState<TemplateComponent[]>([
    { type: 'BODY', text: '' },
  ])
  const [variables, setVariables] = useState<Array<{
    variable_name: string
    position: number
    component_type: 'HEADER' | 'BODY'
    extraction_field: string
    default_value: string
    sample_value: string
  }>>([])

  // Load existing template
  const { data: templateData, isLoading: loadingTemplate } = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => templatesApi.get(templateId!),
    enabled: !!templateId,
  })

  // Populate form when template data loads
  useEffect(() => {
    if (templateData) {
      setName(templateData.template.name)
      setCategory(templateData.template.category)
      setUserId(templateData.template.user_id)
      setPhoneNumberId(templateData.template.phone_number_id)
      setComponents(templateData.template.components)
      setVariables(templateData.variables.map((v: TemplateVariable) => ({
        variable_name: v.variable_name,
        position: v.position,
        component_type: v.component_type,
        extraction_field: v.extraction_field || '',
        default_value: v.default_value || '',
        sample_value: v.sample_value,
      })))
    }
  }, [templateData])

  // Load users and phone numbers for selection
  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.list({ limit: 100 }),
  })

  const { data: phoneNumbersData } = useQuery({
    queryKey: ['phone-numbers-list'],
    queryFn: () => phoneNumbersApi.list({ limit: 100 }),
  })

  const filteredPhoneNumbers = phoneNumbersData?.data.filter(
    (p) => p.user_id === userId && p.platform === 'whatsapp'
  ) || []

  // Create mutation
  const createMutation = useMutation({
    mutationFn: templatesApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast({ title: 'Template created successfully' })
      navigate(`/templates/${data.template_id}`)
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Failed to create template', description: error.message })
    },
  })

  const submitMutation = useMutation({
    mutationFn: templatesApi.submit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast({ title: 'Template submitted to Meta for review' })
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Failed to submit template' })
    },
  })

  const addComponent = (type: TemplateComponent['type']) => {
    if (type === 'HEADER' && components.some((c) => c.type === 'HEADER')) {
      toast({ variant: 'destructive', title: 'Only one header allowed' })
      return
    }
    if (type === 'FOOTER' && components.some((c) => c.type === 'FOOTER')) {
      toast({ variant: 'destructive', title: 'Only one footer allowed' })
      return
    }
    if (type === 'BODY' && components.some((c) => c.type === 'BODY')) {
      toast({ variant: 'destructive', title: 'Only one body allowed' })
      return
    }

    const newComponent: TemplateComponent = { type, text: '' }
    if (type === 'HEADER') newComponent.format = 'TEXT'
    if (type === 'BUTTONS') newComponent.buttons = []

    // Sort: HEADER → BODY → FOOTER → BUTTONS
    const order = { HEADER: 1, BODY: 2, FOOTER: 3, BUTTONS: 4 }
    const newComponents = [...components, newComponent].sort(
      (a, b) => order[a.type] - order[b.type]
    )
    setComponents(newComponents)
  }

  const updateComponent = (index: number, text: string) => {
    const updated = [...components]
    updated[index] = { ...updated[index], text }
    setComponents(updated)
  }

  const removeComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !userId || !phoneNumberId) {
      toast({ variant: 'destructive', title: 'Please fill all required fields' })
      return
    }

    if (!components.some((c) => c.type === 'BODY' && c.text)) {
      toast({ variant: 'destructive', title: 'Body component is required' })
      return
    }

    createMutation.mutate({
      user_id: userId,
      phone_number_id: phoneNumberId,
      name,
      category,
      components,
      variables: variables.map((v, i) => ({ ...v, position: i + 1 })),
    })
  }

  if (loadingTemplate) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/templates">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
        </Link>
      </div>

      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          {isEditing ? 'Edit Template' : 'Create Template'}
        </h2>
        <p className="text-muted-foreground">
          Build a WhatsApp message template with variables
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Template Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  placeholder="welcome_message"
                  disabled={isEditing}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Only lowercase letters, numbers, and underscores
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full h-10 rounded-md border px-3"
                  disabled={isEditing}
                >
                  <option value="MARKETING">Marketing</option>
                  <option value="UTILITY">Utility</option>
                  <option value="AUTHENTICATION">Authentication</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">User</label>
                <select
                  value={userId}
                  onChange={(e) => {
                    setUserId(e.target.value)
                    setPhoneNumberId('')
                  }}
                  className="w-full h-10 rounded-md border px-3"
                  disabled={isEditing}
                >
                  <option value="">Select user</option>
                  {usersData?.data.map((user) => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Phone Number</label>
                <select
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  className="w-full h-10 rounded-md border px-3"
                  disabled={isEditing || !userId}
                >
                  <option value="">Select phone number</option>
                  {filteredPhoneNumbers.map((phone) => (
                    <option key={phone.id} value={phone.id}>
                      {phone.display_name || phone.meta_phone_number_id}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Components</CardTitle>
              <CardDescription>Add header, body, footer, and buttons</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {components.map((component, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">{component.type}</label>
                    {component.type !== 'BODY' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeComponent(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <textarea
                    value={component.text || ''}
                    onChange={(e) => updateComponent(index, e.target.value)}
                    className="w-full min-h-[100px] rounded-md border px-3 py-2"
                    placeholder={`Enter ${component.type.toLowerCase()} text... Use {{1}}, {{2}} for variables`}
                  />
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addComponent('HEADER')}
                  disabled={components.some((c) => c.type === 'HEADER')}
                >
                  <Plus className="h-4 w-4 mr-1" /> Header
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addComponent('FOOTER')}
                  disabled={components.some((c) => c.type === 'FOOTER')}
                >
                  <Plus className="h-4 w-4 mr-1" /> Footer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-[#ece5dd] rounded-lg p-4">
                <div className="bg-white rounded-lg p-3 shadow-sm max-w-[280px]">
                  {components.map((component, index) => (
                    <div key={index}>
                      {component.type === 'HEADER' && (
                        <p className="font-bold text-sm mb-2">{component.text || '[Header]'}</p>
                      )}
                      {component.type === 'BODY' && (
                        <p className="text-sm whitespace-pre-wrap">{component.text || '[Body text]'}</p>
                      )}
                      {component.type === 'FOOTER' && (
                        <p className="text-xs text-gray-500 mt-2">{component.text || '[Footer]'}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            {!isEditing && (
              <Button type="submit" disabled={createMutation.isPending} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {createMutation.isPending ? 'Creating...' : 'Create Template'}
              </Button>
            )}
            {isEditing && (
              <Button
                type="button"
                onClick={() => submitMutation.mutate(templateId!)}
                disabled={submitMutation.isPending}
                className="flex-1"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitMutation.isPending ? 'Submitting...' : 'Submit to Meta'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
