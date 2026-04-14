'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle } from 'lucide-react'

interface Props {
  listingId: string
  sellerId: string
}

export default function MessageSellerButton({ listingId, sellerId }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabaseRef = useRef(createClient())

  const handleMessage = async () => {
    setError('')
    setLoading(true)

    try {
      const { data: { user } } = await supabaseRef.current.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: existing } = await supabaseRef.current
        .from('conversations')
        .select('id')
        .eq('listing_id', listingId)
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${sellerId}),and(participant1_id.eq.${sellerId},participant2_id.eq.${user.id})`)
        .maybeSingle()

      if (existing) {
        router.push(`/messages/${existing.id}`)
        return
      }

      const { data, error } = await supabaseRef.current
        .from('conversations')
        .insert({ listing_id: listingId, participant1_id: user.id, participant2_id: sellerId })
        .select()
        .single()

      if (error) {
        setError(error.message)
      } else {
        router.push(`/messages/${data.id}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={handleMessage} disabled={loading} className="btn-secondary w-full flex items-center justify-center gap-2">
        <MessageCircle className="w-4 h-4" />
        {loading ? 'Opening chat…' : 'Message seller'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
