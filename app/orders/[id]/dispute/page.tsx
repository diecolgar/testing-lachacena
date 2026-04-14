import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import DisputeForm from './DisputeForm'
import StatusBadge from '@/components/StatusBadge'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: order } = await supabase
    .from('orders')
    .select('*, listing:listings(title), buyer:profiles!orders_buyer_id_fkey(id,username), seller:profiles!orders_seller_id_fkey(id,username)')
    .eq('id', orderId)
    .single()

  if (!order) notFound()

  const isBuyer = user.id === order.buyer_id
  const isSeller = user.id === order.seller_id
  if (!isBuyer && !isSeller) redirect('/orders')

  const { data: dispute } = await supabase
    .from('disputes')
    .select('*, reporter:profiles!disputes_reporter_id_fkey(username), admin:profiles!disputes_admin_id_fkey(username)')
    .eq('order_id', orderId)
    .maybeSingle()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href={`/orders/${orderId}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to order
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dispute</h1>

      {/* Order summary */}
      <div className="card p-4 mb-6">
        <p className="text-sm font-medium text-gray-700">
          Order: <span className="text-gray-900">{(order.listing as { title: string })?.title}</span>
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Buyer: {(order.buyer as { username: string })?.username} · Seller: {(order.seller as { username: string })?.username}
        </p>
      </div>

      {dispute ? (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-gray-900">Dispute #{dispute.id.slice(0, 8)}</p>
              <StatusBadge type="dispute" status={dispute.status} />
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500 font-medium">Reason: </span>
                <span className="text-gray-800">{dispute.reason}</span>
              </div>
              {dispute.description && (
                <div>
                  <span className="text-gray-500 font-medium">Description: </span>
                  <p className="text-gray-800 mt-1">{dispute.description}</p>
                </div>
              )}
              <div>
                <span className="text-gray-500 font-medium">Reported by: </span>
                <span className="text-gray-800">{(dispute.reporter as { username: string })?.username}</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Opened: </span>
                <span className="text-gray-800">{formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}</span>
              </div>
              {dispute.admin_id && (
                <div>
                  <span className="text-gray-500 font-medium">Handled by: </span>
                  <span className="text-gray-800">{(dispute.admin as { username: string })?.username}</span>
                </div>
              )}
              {dispute.resolution && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium text-xs mb-1">Resolution</p>
                  <p className="text-green-700">{dispute.resolution}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <DisputeForm orderId={orderId} />
      )}
    </div>
  )
}
