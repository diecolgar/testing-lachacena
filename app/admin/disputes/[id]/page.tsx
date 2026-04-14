import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import DisputeAdminActions from './DisputeAdminActions'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft } from 'lucide-react'

export default async function AdminDisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  const { data: dispute } = await supabase
    .from('disputes')
    .select(`
      *,
      order:orders(
        id, amount, status,
        listing:listings(id, title, price, description),
        buyer:profiles!orders_buyer_id_fkey(id, username, full_name),
        seller:profiles!orders_seller_id_fkey(id, username, full_name)
      ),
      reporter:profiles!disputes_reporter_id_fkey(id, username),
      admin:profiles!disputes_admin_id_fkey(username)
    `)
    .eq('id', id)
    .single()

  if (!dispute) notFound()

  const order = dispute.order as {
    id: string; amount: number; status: string;
    listing: { id: string; title: string; price: number; description: string } | null;
    buyer: { id: string; username: string; full_name: string } | null;
    seller: { id: string; username: string; full_name: string } | null;
  } | null

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/admin" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to admin
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dispute Review</h1>
        <StatusBadge type="dispute" status={dispute.status} />
      </div>

      <div className="space-y-4">
        {/* Dispute info */}
        <div className="card p-4">
          <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Dispute Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2"><dt className="text-gray-500 w-28">Reason</dt><dd className="font-medium">{dispute.reason}</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-28">Reporter</dt><dd>{(dispute.reporter as { username: string })?.username}</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-28">Opened</dt><dd>{formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}</dd></div>
            {dispute.admin_id && (
              <div className="flex gap-2"><dt className="text-gray-500 w-28">Assigned to</dt><dd>{(dispute.admin as { username: string })?.username}</dd></div>
            )}
          </dl>
          {dispute.description && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-medium mb-1">Description</p>
              <p className="text-sm text-gray-700">{dispute.description}</p>
            </div>
          )}
          {dispute.resolution && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-600 font-medium mb-1">Resolution</p>
              <p className="text-sm text-green-800">{dispute.resolution}</p>
            </div>
          )}
        </div>

        {/* Order details */}
        {order && (
          <div className="card p-4">
            <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Order</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2"><dt className="text-gray-500 w-28">Item</dt><dd><Link href={`/listings/${order.listing?.id}`} className="text-blue-600 hover:underline">{order.listing?.title}</Link></dd></div>
              <div className="flex gap-2"><dt className="text-gray-500 w-28">Amount</dt><dd className="font-bold">${Number(order.amount).toFixed(2)}</dd></div>
              <div className="flex gap-2"><dt className="text-gray-500 w-28">Status</dt><dd><StatusBadge type="order" status={order.status} /></dd></div>
              <div className="flex gap-2"><dt className="text-gray-500 w-28">Buyer</dt><dd>{order.buyer?.username} ({order.buyer?.full_name})</dd></div>
              <div className="flex gap-2"><dt className="text-gray-500 w-28">Seller</dt><dd>{order.seller?.username} ({order.seller?.full_name})</dd></div>
            </dl>
          </div>
        )}

        {/* Admin actions */}
        {['open', 'under_review'].includes(dispute.status) && (
          <DisputeAdminActions
            disputeId={id}
            orderId={order?.id ?? ''}
            currentStatus={dispute.status}
            adminId={user.id}
            buyerId={order?.buyer?.id ?? ''}
            sellerId={order?.seller?.id ?? ''}
          />
        )}
      </div>
    </div>
  )
}
