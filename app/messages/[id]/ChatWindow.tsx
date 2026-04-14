'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { Send } from 'lucide-react'

interface Props {
  conversationId: string
  currentUserId: string
  initialMessages: Message[]
}

export default function ChatWindow({ conversationId, currentUserId, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const { data: sender } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', (payload.new as Message).sender_id)
            .single()

          const msg: Message = { ...(payload.new as Message), sender: sender ?? undefined }
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })

          if ((payload.new as Message).sender_id !== currentUserId) {
            await supabase.from('messages').update({ is_read: true }).eq('id', (payload.new as Message).id)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, currentUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = input.trim()
    if (!content || sending) return

    setSending(true)
    setInput('')

    try {
      await supabaseRef.current.from('messages').insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content,
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 card overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => {
          const isOwn = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                <div className={`rounded-2xl px-4 py-2 text-sm ${isOwn ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                  {msg.content}
                </div>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="border-t border-gray-100 p-3 flex gap-2">
        <input
          type="text"
          className="input flex-1"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message…"
          disabled={sending}
        />
        <button type="submit" disabled={sending || !input.trim()} className="btn-primary px-3 py-2">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
