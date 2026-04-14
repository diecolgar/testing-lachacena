'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { OrderStatus } from '@/lib/types'

const STATUS_LABELS: Record<string, string> = {
  paid: 'Mark as Paid',
  shipped: 'Mark as Shipped',
  delivered: 'Confirm Delivery',
  cancelled: 'Cancel Order',
}

interface Props {
  orderId: string
  currentStatus: string
  nextStatuses: string[]
  isBuyer: boolean
  isSeller: boolean
  canDispute: boolean
  canReview: boolean
  listingId: string
  sellerId: string
}

export default function OrderActions({
  orderId, currentStatus, nextStatuses, isBuyer, isSeller, canDispute, canReview, listingId, sellerId
}: Props) {
  const [loading, setLoading] = useState('')
  const [review, setReview] = useState({ rating: 5, comment: '' })
  const [showReview, setShowReview] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const updateStatus = async (newStatus: string) => {
    setLoading(newStatus)
    setError('')

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus as OrderStatus })
      .eq('id', orderId)

    if (error) {
      setError(error.message)
    } else {
      router.refresh()
    }
    setLoading('')
  }

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading('review')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('reviews').insert({
      order_id: orderId,
      reviewer_id: user.id,
      reviewee_id: sellerId,
      rating: review.rating,
      comment: review.comment || null,
    })

    if (error) {
      setError(error.message)
    } else {
      setShowReview(false)
      router.refresh()
    }
    setLoading('')
  }

  // Determine which buttons to show per role
  const buyerStatuses = ['paid', 'delivered', 'cancelled']
  const sellerStatuses = ['shipped', 'cancelled']

  const availableActions = nextStatuses.filter(s => {
    if (isBuyer && buyerStatuses.includes(s)) return true
    if (isSeller && sellerStatuses.includes(s)) return true
    return false
  })

  if (availableActions.length === 0 && !canDispute && !canReview) return null

  return (
    <div className="space-y-3">
      {availableActions.map(status => (
        <button
          key={status}
          onClick={() => updateStatus(status)}
          disabled={!!loading}
          className={status === 'cancelled' ? 'btn-danger w-full' : 'btn-primary w-full'}
        >
          {loading === status ? 'Updating…' : STATUS_LABELS[status] ?? status}
        </button>
      ))}

      {canDispute && (
        <Link href={`/orders/${orderId}/dispute`} className="btn-secondary w-full block text-center text-red-600 border-red-200 hover:bg-red-50">
          Open dispute
        </Link>
      )}

      {canReview && !showReview && (
        <button onClick={() => setShowReview(true)} className="btn-secondary w-full">
          Leave a review
        </button>
      )}

      {showReview && (
        <form onSubmit={submitReview} className="card p-4 space-y-3">
          <p className="font-medium text-sm">Leave a review for the seller</p>
          <div>
            <label className="label">Rating</label>
            <select className="input" value={review.rating} onChange={e => setReview(r => ({ ...r, rating: Number(e.target.value) }))}>
              {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} star{r !== 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Comment (optional)</label>
            <textarea className="input" value={review.comment} onChange={e => setReview(r => ({ ...r, comment: e.target.value }))} rows={3} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowReview(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={!!loading} className="btn-primary flex-1">
              {loading === 'review' ? 'Submitting…' : 'Submit review'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
