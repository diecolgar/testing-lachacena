'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle } from 'lucide-react'

interface Props {
  listingId: string
  sellerId: string
}

export default function MessageSellerButton({ listingId, sellerId }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleMessage = async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('listing_id', listingId)
      .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${sellerId}),and(participant1_id.eq.${sellerId},participant2_id.eq.${user.id})`)
      .maybeSingle()

    if (existing) {
      router.push(`/messages/${existing.id}`)
      return
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({ listing_id: listingId, participant1_id: user.id, participant2_id: sellerId })
      .select()
      .single()

    if (error) {
      console.error(error)
      setLoading(false)
    } else {
      router.push(`/messages/${data.id}`)
    }
  }

  return (
    <button onClick={handleMessage} disabled={loading} className="btn-secondary w-full flex items-center justify-center gap-2">
      <MessageCircle className="w-4 h-4" />
      {loading ? 'Opening chat…' : 'Message seller'}
    </button>
  )
}
