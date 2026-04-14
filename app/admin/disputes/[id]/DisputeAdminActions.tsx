'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { DisputeStatus, OrderStatus } from '@/lib/types'

interface Props {
  disputeId: string
  orderId: string
  currentStatus: string
  adminId: string
  buyerId: string
  sellerId: string
}

export default function DisputeAdminActions({ disputeId, orderId, currentStatus, adminId, buyerId, sellerId }: Props) {
  const [resolution, setResolution] = useState('')
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const startReview = async () => {
    setLoading('review')
    const { error } = await supabase
      .from('disputes')
      .update({ status: 'under_review' as DisputeStatus, admin_id: adminId })
      .eq('id', disputeId)

    if (error) setError(error.message)
    else router.refresh()
    setLoading('')
  }

  const resolve = async (winner: 'buyer' | 'seller') => {
    if (!resolution.trim()) {
      setError('Please enter a resolution description')
      return
    }
    setLoading(winner)

    const newDisputeStatus: DisputeStatus = winner === 'buyer' ? 'resolved_buyer' : 'resolved_seller'
    const newOrderStatus: OrderStatus = winner === 'buyer' ? 'refunded' : 'delivered'

    const [disputeResult, orderResult] = await Promise.all([
      supabase.from('disputes').update({
        status: newDisputeStatus,
        resolution,
        admin_id: adminId,
      }).eq('id', disputeId),
      supabase.from('orders').update({ status: newOrderStatus }).eq('id', orderId),
    ])

    if (disputeResult.error) {
      setError(disputeResult.error.message)
    } else if (orderResult.error) {
      setError(orderResult.error.message)
    } else {
      router.refresh()
    }
    setLoading('')
  }

  const closeDispute = async () => {
    setLoading('close')
    const { error } = await supabase
      .from('disputes')
      .update({ status: 'closed' as DisputeStatus, admin_id: adminId, resolution: resolution || 'Closed by admin.' })
      .eq('id', disputeId)

    if (error) setError(error.message)
    else router.refresh()
    setLoading('')
  }

  return (
    <div className="card p-5 border-amber-200 bg-amber-50/30">
      <h3 className="font-semibold text-gray-900 mb-4">Admin Actions</h3>

      {currentStatus === 'open' && (
        <button onClick={startReview} disabled={!!loading} className="btn-primary mb-4">
          {loading === 'review' ? 'Starting review…' : 'Start review'}
        </button>
      )}

      <div className="space-y-3">
        <div>
          <label className="label">Resolution notes *</label>
          <textarea
            className="input min-h-[80px]"
            value={resolution}
            onChange={e => setResolution(e.target.value)}
            placeholder="Describe the resolution decision and reasoning…"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => resolve('buyer')}
            disabled={!!loading}
            className="btn-primary bg-blue-600 text-sm"
          >
            {loading === 'buyer' ? '…' : 'Resolve: Buyer wins'}
          </button>
          <button
            onClick={() => resolve('seller')}
            disabled={!!loading}
            className="btn-primary bg-green-600 text-sm"
          >
            {loading === 'seller' ? '…' : 'Resolve: Seller wins'}
          </button>
          <button
            onClick={closeDispute}
            disabled={!!loading}
            className="btn-secondary text-sm"
          >
            {loading === 'close' ? '…' : 'Close dispute'}
          </button>
        </div>

        <p className="text-xs text-gray-500">
          • <strong>Buyer wins</strong>: Order marked as refunded<br />
          • <strong>Seller wins</strong>: Order marked as delivered<br />
          • <strong>Close</strong>: Dispute closed without changing order status
        </p>
      </div>

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  )
}
