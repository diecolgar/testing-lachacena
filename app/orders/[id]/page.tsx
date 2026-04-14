import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import OrderActions from './OrderActions'
import { formatDistanceToNow } from 'date-fns'
import { Package, User, ArrowLeft } from 'lucide-react'

const STATUS_FLOW: Record<string, string[]> = {
  pending:   ['paid', 'cancelled'],
  paid:      ['shipped', 'cancelled'],
  shipped:   ['delivered'],
  delivered: [],
  cancelled: [],
  disputed:  [],
  refunded:  [],
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      listing:listings(id, title, images, description),
      buyer:profiles!orders_buyer_id_fkey(id, username, full_name),
      seller:profiles!orders_seller_id_fkey(id, username, full_name)
    `)
    .eq('id', id)
    .single()

  if (!order) notFound()

  const isBuyer = user.id === order.buyer_id
  const isSeller = user.id === order.seller_id
  if (!isBuyer && !isSeller) redirect('/orders')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Determine available actions for this user
  const nextStatuses = STATUS_FLOW[order.status] ?? []
  const canDispute = (isBuyer || isSeller) && ['paid', 'shipped', 'delivered'].includes(order.status)

  // Existing dispute
  const { data: dispute } = await supabase
    .from('disputes')
    .select('id, status')
    .eq('order_id', id)
    .maybeSingle()

  // Reviews
  const { data: review } = await supabase
    .from('reviews')
    .select('id, rating, comment')
    .eq('order_id', id)
    .eq('reviewer_id', user.id)
    .maybeSingle()

  const canReview = order.status === 'delivered' && !review

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/orders" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to orders
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order</h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{id}</p>
        </div>
        <StatusBadge type="order" status={order.status} />
      </div>

      {/* Listing */}
      <div className="card p-4 mb-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden shrink-0">
          {(order.listing as { images?: string[] })?.images?.[0] ? (
            <img src={(order.listing as { images: string[] }).images[0]} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-gray-400" /></div>
          )}
        </div>
        <div className="flex-1">
          <Link href={`/listings/${(order.listing as { id: string }).id}`} className="font-semibold text-gray-900 hover:text-blue-600 text-sm">
            {(order.listing as { title: string })?.title}
          </Link>
          <p className="text-sm font-bold text-blue-600 mt-0.5">${Number(order.amount).toFixed(2)}</p>
        </div>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium mb-2">BUYER</p>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium">{(order.buyer as { username: string })?.username}</span>
          </div>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 font-medium mb-2">SELLER</p>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium">{(order.seller as { username: string })?.username}</span>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <p className="text-xs text-gray-500 font-medium mb-1">PLACED</p>
        <p className="text-sm text-gray-700">{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</p>
        {order.notes && (
          <>
            <p className="text-xs text-gray-500 font-medium mt-3 mb-1">NOTES</p>
            <p className="text-sm text-gray-700">{order.notes}</p>
          </>
        )}
      </div>

      {/* Dispute notice */}
      {dispute && (
        <div className={`rounded-lg p-3 mb-4 text-sm ${dispute.status === 'open' || dispute.status === 'under_review' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-gray-50 border border-gray-200 text-gray-700'}`}>
          Dispute: <StatusBadge type="dispute" status={dispute.status} />
          {(isSeller || isBuyer || isAdmin) && (
            <Link href={`/orders/${id}/dispute`} className="ml-2 text-blue-600 hover:underline text-xs">View</Link>
          )}
        </div>
      )}

      <OrderActions
        orderId={id}
        currentStatus={order.status}
        nextStatuses={nextStatuses}
        isBuyer={isBuyer}
        isSeller={isSeller}
        canDispute={canDispute && !dispute}
        canReview={canReview}
        listingId={(order.listing as { id: string }).id}
        sellerId={order.seller_id}
      />
    </div>
  )
}
