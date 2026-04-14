import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import ChatWindow from './ChatWindow'
import { ArrowLeft, Package } from 'lucide-react'

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: conv } = await supabase
    .from('conversations')
    .select(`
      *,
      listing:listings(id, title, images, price, status),
      participant1:profiles!conversations_participant1_id_fkey(id, username),
      participant2:profiles!conversations_participant2_id_fkey(id, username)
    `)
    .eq('id', id)
    .single()

  if (!conv) notFound()

  // Ensure current user is a participant
  if (conv.participant1_id !== user.id && conv.participant2_id !== user.id) {
    redirect('/messages')
  }

  // Mark messages as read
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', id)
    .neq('sender_id', user.id)

  // Fetch messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*, sender:profiles(id, username)')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  const other = conv.participant1_id === user.id
    ? (conv.participant2 as { id: string; username: string })
    : (conv.participant1 as { id: string; username: string })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/messages" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-sm">
          {other?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{other?.username}</p>
          {conv.listing && (
            <Link href={`/listings/${(conv.listing as { id: string }).id}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600">
              <Package className="w-3 h-3" />
              {(conv.listing as { title: string }).title}
            </Link>
          )}
        </div>
      </div>

      <ChatWindow
        conversationId={id}
        currentUserId={user.id}
        initialMessages={messages ?? []}
      />
    </div>
  )
}
