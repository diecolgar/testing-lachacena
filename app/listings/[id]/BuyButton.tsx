'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShoppingCart } from 'lucide-react'

interface Props {
  listingId: string
  sellerId: string
  amount: number
}

export default function BuyButton({ listingId, sellerId, amount }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabaseRef = useRef(createClient())

  const handleBuy = async () => {
    setError('')
    setLoading(true)

    try {
      const { data: { user } } = await supabaseRef.current.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data, error } = await supabaseRef.current
        .from('orders')
        .insert({ listing_id: listingId, buyer_id: user.id, seller_id: sellerId, amount })
        .select()
        .single()

      if (error) {
        setError(error.message)
      } else {
        router.push(`/orders/${data.id}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={handleBuy} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
        <ShoppingCart className="w-4 h-4" />
        {loading ? 'Processing…' : `Buy for $${amount.toFixed(2)}`}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
