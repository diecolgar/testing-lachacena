'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const REASONS = [
  'Item not received', 'Item not as described', 'Item damaged',
  'Seller unresponsive', 'Buyer not paying', 'Fraud', 'Other',
]

export default function DisputeForm({ orderId }: { orderId: string }) {
  const [form, setForm] = useState({ reason: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabaseRef = useRef(createClient())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: { user } } = await supabaseRef.current.auth.getUser()
      if (!user) return

      await supabaseRef.current.from('orders').update({ status: 'disputed' }).eq('id', orderId)

      const { error } = await supabaseRef.current.from('disputes').insert({
        order_id: orderId,
        reporter_id: user.id,
        reason: form.reason,
        description: form.description || null,
      })

      if (error) {
        setError(error.message)
      } else {
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Open a dispute</h2>
      <p className="text-sm text-gray-500 mb-4">
        Disputes are reviewed by our admin team. Please provide as much detail as possible.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Reason *</label>
          <select className="input" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} required>
            <option value="">Select a reason</option>
            {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Additional details</label>
          <textarea className="input min-h-[100px]" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the issue in detail…" maxLength={1000} />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
        <button type="submit" disabled={loading} className="btn-danger w-full">
          {loading ? 'Submitting…' : 'Submit dispute'}
        </button>
      </form>
    </div>
  )
}
