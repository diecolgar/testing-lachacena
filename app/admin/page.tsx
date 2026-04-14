import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import { formatDistanceToNow } from 'date-fns'
import { ShieldCheck, AlertTriangle, Users, Package, MessageSquare } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  // Dashboard stats
  const [
    { count: totalUsers },
    { count: totalListings },
    { count: openDisputes },
    { data: recentDisputes },
    { data: recentOrders },
    { data: users },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('disputes').select('*', { count: 'exact', head: true }).in('status', ['open', 'under_review']),
    supabase
      .from('disputes')
      .select('*, order:orders(id, amount, listing:listings(title)), reporter:profiles!disputes_reporter_id_fkey(username)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('orders')
      .select('*, listing:listings(title), buyer:profiles!orders_buyer_id_fkey(username), seller:profiles!orders_seller_id_fkey(username)')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <ShieldCheck className="w-7 h-7 text-amber-500" />
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: totalUsers ?? 0, icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Active Listings', value: totalListings ?? 0, icon: Package, color: 'text-green-600 bg-green-50' },
          { label: 'Open Disputes', value: openDisputes ?? 0, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
          { label: 'Platform', value: 'Live', icon: ShieldCheck, color: 'text-amber-600 bg-amber-50' },
        ].map(stat => (
          <div key={stat.label} className="card p-4">
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disputes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Recent Disputes
            </h2>
          </div>
          <div className="space-y-2">
            {recentDisputes && recentDisputes.length > 0 ? recentDisputes.map(d => (
              <Link
                key={d.id}
                href={`/admin/disputes/${d.id}`}
                className="card p-3 flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {(d.order?.listing as { title: string } | null)?.title ?? 'Deleted listing'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {d.reason} · by {(d.reporter as { username: string })?.username}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                  </p>
                </div>
                <StatusBadge type="dispute" status={d.status} />
              </Link>
            )) : (
              <div className="card p-6 text-center text-gray-400 text-sm">No disputes</div>
            )}
          </div>
        </section>

        {/* Recent Orders */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Recent Orders</h2>
          <div className="space-y-2">
            {recentOrders && recentOrders.length > 0 ? recentOrders.map(o => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="card p-3 flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {(o.listing as { title: string })?.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(o.buyer as { username: string })?.username} → {(o.seller as { username: string })?.username}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold">${Number(o.amount).toFixed(2)}</span>
                  <StatusBadge type="order" status={o.status} />
                </div>
              </Link>
            )) : (
              <div className="card p-6 text-center text-gray-400 text-sm">No orders</div>
            )}
          </div>
        </section>

        {/* Users */}
        <section className="lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Recent Users
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">User</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Verified</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users?.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{u.username}</p>
                        <p className="text-xs text-gray-400">{u.full_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.is_verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.is_verified ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="text-blue-600 hover:underline text-xs">
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
