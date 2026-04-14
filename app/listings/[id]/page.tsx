import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import StatusBadge from '@/components/StatusBadge'
import BuyButton from './BuyButton'
import MessageSellerButton from './MessageSellerButton'
import { MapPin, Calendar, User, Star } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Listing, Review } from '@/lib/types'

const CONDITION_LABELS: Record<string, string> = {
  new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair', poor: 'Poor',
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Increment view count
  await supabase.rpc('increment_views' as never, { listing_id: id }).maybeSingle()

  const { data: listing } = await supabase
    .from('listings')
    .select('*, seller:profiles(*), category:categories(*)')
    .eq('id', id)
    .single()

  if (!listing) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch seller reviews
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles(*)')
    .eq('reviewee_id', (listing as unknown as Listing).seller_id)
    .order('created_at', { ascending: false })
    .limit(5)

  const avgRating = reviews?.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const isOwner = user?.id === (listing as unknown as Listing).seller_id

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-3">
          {listing.images && listing.images.length > 0 ? (
            <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
              <Image src={listing.images[0]} alt={listing.title} fill className="object-cover" />
            </div>
          ) : (
            <div className="aspect-square rounded-xl bg-gray-100 flex items-center justify-center text-8xl">
              {listing.category?.icon ?? '📦'}
            </div>
          )}
          {listing.images && listing.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {listing.images.slice(1, 5).map((img: string, i: number) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <Image src={img} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
              <StatusBadge type="listing" status={listing.status} />
            </div>
            <p className="text-3xl font-bold text-blue-600">${Number(listing.price).toFixed(2)}</p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-gray-500">
            {listing.condition && (
              <span className="flex items-center gap-1">
                Condition: <strong className="text-gray-700">{CONDITION_LABELS[listing.condition]}</strong>
              </span>
            )}
            {listing.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {listing.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}
            </span>
          </div>

          <div className="card p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Description</p>
            <p className="text-gray-600 text-sm whitespace-pre-wrap">{listing.description}</p>
          </div>

          {/* Seller info */}
          <div className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{listing.seller?.username}</p>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  {avgRating ? (
                    <>
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      <span>{avgRating} ({reviews?.length} reviews)</span>
                    </>
                  ) : (
                    <span>No reviews yet</span>
                  )}
                </div>
              </div>
            </div>
            <Link href={`/profile/${listing.seller?.username}`} className="text-sm text-blue-600 hover:underline">
              View profile
            </Link>
          </div>

          {/* Actions */}
          {!isOwner && listing.status === 'active' && user && (
            <div className="flex flex-col gap-2">
              <BuyButton listingId={listing.id} sellerId={listing.seller_id} amount={Number(listing.price)} />
              <MessageSellerButton listingId={listing.id} sellerId={listing.seller_id} />
            </div>
          )}
          {!user && listing.status === 'active' && (
            <Link href="/auth/login" className="btn-primary block text-center">
              Sign in to buy or message seller
            </Link>
          )}
          {isOwner && (
            <Link href={`/listings/${listing.id}/edit`} className="btn-secondary block text-center">
              Edit listing
            </Link>
          )}
        </div>
      </div>

      {/* Reviews section */}
      {reviews && reviews.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Seller Reviews</h2>
          <div className="space-y-3">
            {(reviews as unknown as Review[]).map(review => (
              <div key={review.id} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{review.reviewer?.username}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                  </span>
                </div>
                {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
