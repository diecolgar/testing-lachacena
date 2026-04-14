import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import UserAdminActions from './UserAdminActions'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, User } from 'lucide-react'

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) redirect('/auth/login')

  const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single()
  if (adminProfile?.role !== 'admin') redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  const [{ data: listings }, { data: orders }, { data: reviews }] = await Promise.all([
    supabase.from('listings').select('id, title, status, price, created_at').eq('seller_id', id).order('created_at', { ascending: false }).limit(5),
    supabase.from('orders').select('id, amount, status, created_at').or(`buyer_id.eq.${id},seller_id.eq.${id}`).order('created_at', { ascending: false }).limit(5),
    supabase.from('reviews').select('rating').eq('reviewee_id', id),
  ])

  const avgRating = reviews?.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/admin" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to admin
      </Link>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{profile.username}</h1>
            <p className="text-gray-500 text-sm">{profile.full_name}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <span className={`badge ${profile.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>{profile.role}</span>
            {profile.is_verified && <span className="badge bg-green-100 text-green-700">Verified</span>}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-gray-500">Member since</dt><dd>{formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}</dd></div>
          <div><dt className="text-gray-500">Avg. rating</dt><dd>{avgRating ? `${avgRating} ⭐ (${reviews?.length})` : 'No reviews'}</dd></div>
          {profile.location && <div><dt className="text-gray-500">Location</dt><dd>{profile.location}</dd></div>}
          {profile.bio && <div className="col-span-2"><dt className="text-gray-500">Bio</dt><dd>{profile.bio}</dd></div>}
        </dl>
      </div>

      <UserAdminActions
        userId={id}
        currentRole={profile.role}
        isVerified={profile.is_verified}
        isSelf={currentUser.id === id}
      />

      <div className="grid grid-cols-1 gap-4 mt-6">
        {listings && listings.length > 0 && (
          <div className="card p-4">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">Recent Listings</h3>
            <div className="space-y-2">
              {listings.map(l => (
                <div key={l.id} className="flex items-center justify-between text-sm">
                  <Link href={`/listings/${l.id}`} className="text-blue-600 hover:underline truncate mr-2">{l.title}</Link>
                  <span className="text-gray-500 shrink-0">${Number(l.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {orders && orders.length > 0 && (
          <div className="card p-4">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">Recent Orders</h3>
            <div className="space-y-2">
              {orders.map(o => (
                <div key={o.id} className="flex items-center justify-between text-sm">
                  <Link href={`/orders/${o.id}`} className="text-blue-600 hover:underline font-mono text-xs">{o.id.slice(0, 12)}…</Link>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">${Number(o.amount).toFixed(2)}</span>
                    <span className="badge bg-gray-100 text-gray-600">{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
