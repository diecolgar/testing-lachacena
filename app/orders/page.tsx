import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import { formatDistanceToNow } from 'date-fns'
import { Package } from 'lucide-react'

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: buying }, { data: selling }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, listing:listings(id, title, images), seller:profiles!orders_seller_id_fkey(username)')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('*, listing:listings(id, title, images), buyer:profiles!orders_buyer_id_fkey(username)')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const OrderList = ({ orders, role }: { orders: typeof buying; role: 'buyer' | 'seller' }) => (
    orders && orders.length > 0 ? (
      <div className="space-y-3">
        {orders.map(order => (
          <Link key={order.id} href={`/orders/${order.id}`} className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
              {(order.listing as { images?: string[] })?.images?.[0] ? (
                <img src={(order.listing as { images: string[] }).images[0]} alt="" className="w-full h-full object-cover" />
              ) : (
                <Package className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {(order.listing as { title: string })?.title ?? 'Deleted listing'}
              </p>
              <p className="text-xs text-gray-500">
                {role === 'buyer' ? `Seller: ${(order.seller as { username: string })?.username}` : `Buyer: ${(order.buyer as { username: string })?.username}`}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <p className="font-bold text-gray-900">${Number(order.amount).toFixed(2)}</p>
              <StatusBadge type="order" status={order.status} />
            </div>
          </Link>
        ))}
      </div>
    ) : (
      <div className="card p-8 text-center text-gray-400">
        <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No orders yet</p>
      </div>
    )
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Orders</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Purchases</h2>
          <OrderList orders={buying} role="buyer" />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Sales</h2>
          <OrderList orders={selling} role="seller" />
        </section>
      </div>
    </div>
  )
}
