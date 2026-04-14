import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MessageCircle } from 'lucide-react'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      *,
      listing:listings(id, title, images),
      participant1:profiles!conversations_participant1_id_fkey(id, username, avatar_url),
      participant2:profiles!conversations_participant2_id_fkey(id, username, avatar_url)
    `)
    .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false })

  // Get unread counts per conversation
  const conversationIds = conversations?.map(c => c.id) ?? []
  const { data: unreadCounts } = conversationIds.length
    ? await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_id', user.id)
    : { data: [] }

  const unreadMap = (unreadCounts ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.conversation_id] = (acc[m.conversation_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <MessageCircle className="w-6 h-6" />
        Messages
      </h1>

      {!conversations || conversations.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <MessageCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600">No conversations yet</p>
          <p className="text-sm mt-1">When you contact a seller or a buyer messages you, it will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => {
            const other = conv.participant1_id === user.id ? conv.participant2 : conv.participant1
            const unread = unreadMap[conv.id] ?? 0

            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className={`card p-4 flex items-center gap-3 hover:shadow-md transition-shadow ${unread > 0 ? 'border-blue-200 bg-blue-50/30' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 font-bold text-blue-600 text-sm">
                  {(other as { username: string })?.username?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900 text-sm">
                      {(other as { username: string })?.username ?? 'Unknown'}
                    </p>
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                    </span>
                  </div>
                  {conv.listing && (
                    <p className="text-xs text-gray-500 truncate">
                      Re: {(conv.listing as { title: string }).title}
                    </p>
                  )}
                </div>
                {unread > 0 && (
                  <span className="badge bg-blue-600 text-white shrink-0">{unread}</span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
