import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { conversationsApi, Message } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, MessageSquare, X } from 'lucide-react'

export default function ConversationsPage() {
  const [search, setSearch] = useState('')
  const [page, _setPage] = useState(0)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const limit = 20

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', page],
    queryFn: () => conversationsApi.list({ limit, offset: page * limit }),
  })

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ['conversation-messages', selectedConversationId],
    queryFn: () => conversationsApi.getMessages(selectedConversationId!, { limit: 100 }),
    enabled: !!selectedConversationId,
  })

  const filteredData = data?.data.filter(
    (conv) =>
      conv.customer_phone.includes(search) ||
      conv.conversation_id.toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Conversations</h2>
        <p className="text-muted-foreground">View all conversations across agents</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by phone or conversation ID..."
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
                <div className="space-y-2">
                  {filteredData.map((conv) => (
                    <div
                      key={conv.conversation_id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedConversationId === conv.conversation_id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedConversationId(conv.conversation_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{conv.customer_phone}</p>
                          <p className="text-sm text-muted-foreground">{conv.agent_name}</p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              conv.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {conv.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(conv.last_message_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="flex-row items-center justify-between border-b py-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <span className="font-medium">
                  {selectedConversationId ? 'Messages' : 'Select a conversation'}
                </span>
              </div>
              {selectedConversationId && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedConversationId(null)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4">
              {!selectedConversationId ? (
                <p className="text-center text-muted-foreground mt-10">
                  Select a conversation to view messages
                </p>
              ) : messagesLoading ? (
                <p className="text-center text-muted-foreground mt-10">Loading messages...</p>
              ) : (
                <div className="space-y-4">
                  {messagesData?.data.map((message: Message) => (
                    <div
                      key={message.message_id}
                      className={`flex ${message.sender === 'agent' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.sender === 'agent'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender === 'agent' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
