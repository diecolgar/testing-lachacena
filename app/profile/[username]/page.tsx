import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ListingCard from '@/components/ListingCard'
import type { Listing } from '@/lib/types'
import { User, Star, MapPin, Calendar, ShieldCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const [{ data: listings }, { data: reviews }] = await Promise.all([
    supabase
      .from('listings')
      .select('*, seller:profiles(*), category:categories(*)')
      .eq('seller_id', profile.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    supabase
      .from('reviews')
      .select('*, reviewer:profiles(*)')
      .eq('reviewee_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const avgRating = reviews?.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile header */}
      <div className="card p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{profile.username}</h1>
              {profile.is_verified && (
                <span className="flex items-center gap-1 badge bg-blue-100 text-blue-700">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </span>
              )}
              {profile.role === 'admin' && (
                <span className="badge bg-amber-100 text-amber-800">Admin</span>
              )}
            </div>
            {profile.full_name && <p className="text-gray-500 mt-0.5">{profile.full_name}</p>}
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
              {avgRating && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  {avgRating} ({reviews?.length} reviews)
                </span>
              )}
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {profile.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Member {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
              </span>
            </div>
            {profile.bio && <p className="text-gray-700 text-sm mt-3">{profile.bio}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Listings */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Active Listings ({listings?.length ?? 0})
          </h2>
          {listings && listings.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {listings.map(l => <ListingCard key={l.id} listing={l as unknown as Listing} />)}
            </div>
          ) : (
            <div className="card p-8 text-center text-gray-400 text-sm">No active listings</div>
          )}
        </div>

        {/* Reviews */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Reviews</h2>
          {reviews && reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map(r => (
                <div key={r.id} className="card p-3">
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                    ))}
                    <span className="text-xs text-gray-500 ml-1">{(r.reviewer as { username: string })?.username}</span>
                  </div>
                  {r.comment && <p className="text-xs text-gray-600">{r.comment}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-6 text-center text-gray-400 text-sm">No reviews yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
