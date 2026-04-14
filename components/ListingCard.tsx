import Link from 'next/link'
import Image from 'next/image'
import type { Listing } from '@/lib/types'
import { MapPin, Eye } from 'lucide-react'

const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
}

interface Props {
  listing: Listing
}

export default function ListingCard({ listing }: Props) {
  const imageUrl = listing.images?.[0] ?? null

  return (
    <Link href={`/listings/${listing.id}`} className="card group hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">
            {listing.category?.icon ?? '📦'}
          </div>
        )}
        {listing.status === 'sold' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-lg tracking-wide">SOLD</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug">
          {listing.title}
        </h3>
        <p className="text-blue-600 font-bold text-base">${Number(listing.price).toFixed(2)}</p>

        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex items-center gap-1 text-gray-400 text-xs">
            {listing.location && (
              <>
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[80px]">{listing.location}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {listing.condition && (
              <span className="badge bg-gray-100 text-gray-600">{CONDITION_LABELS[listing.condition]}</span>
            )}
            <span className="flex items-center gap-0.5 text-gray-400 text-xs">
              <Eye className="w-3 h-3" />
              {listing.views}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
