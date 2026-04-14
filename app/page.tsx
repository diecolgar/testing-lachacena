import { createClient } from '@/lib/supabase/server'
import ListingCard from '@/components/ListingCard'
import type { Listing } from '@/lib/types'
import { Search } from 'lucide-react'

interface SearchParams {
  q?: string
  category?: string
  condition?: string
  min?: string
  max?: string
}

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const supabase = await createClient()

  // Fetch categories
  const { data: categories } = await supabase.from('categories').select('*').order('name')

  // Build listings query
  let query = supabase
    .from('listings')
    .select('*, seller:profiles(*), category:categories(*)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(48)

  if (params.q) query = query.ilike('title', `%${params.q}%`)
  if (params.category) query = query.eq('category_id', Number(params.category))
  if (params.condition) query = query.eq('condition', params.condition)
  if (params.min) query = query.gte('price', Number(params.min))
  if (params.max) query = query.lte('price', Number(params.max))

  const { data: listings } = await query

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero search */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Find great deals nearby</h1>
        <p className="text-gray-500 mb-6">Buy and sell items safely with our trusted marketplace</p>

        <form method="GET" className="max-w-2xl mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Search listings..."
              className="input pl-9"
            />
          </div>
          <button type="submit" className="btn-primary">Search</button>
        </form>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters sidebar */}
        <aside className="lg:w-56 shrink-0">
          <form method="GET" className="card p-4 space-y-4">
            {params.q && <input type="hidden" name="q" value={params.q} />}

            <div>
              <label className="label">Category</label>
              <select name="category" defaultValue={params.category ?? ''} className="input">
                <option value="">All categories</option>
                {categories?.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Condition</label>
              <select name="condition" defaultValue={params.condition ?? ''} className="input">
                <option value="">Any condition</option>
                <option value="new">New</option>
                <option value="like_new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            <div>
              <label className="label">Price range</label>
              <div className="flex gap-2">
                <input name="min" type="number" placeholder="Min" defaultValue={params.min} className="input" min="0" />
                <input name="max" type="number" placeholder="Max" defaultValue={params.max} className="input" min="0" />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full">Apply</button>
            {(params.category || params.condition || params.min || params.max) && (
              <a href="/" className="block text-center text-sm text-gray-500 hover:text-gray-700">Clear filters</a>
            )}
          </form>
        </aside>

        {/* Listings grid */}
        <div className="flex-1">
          {listings && listings.length > 0 ? (
            <>
              <p className="text-sm text-gray-500 mb-4">{listings.length} listing{listings.length !== 1 ? 's' : ''} found</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {listings.map(l => <ListingCard key={l.id} listing={l as unknown as Listing} />)}
              </div>
            </>
          ) : (
            <div className="card p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-medium text-gray-600">No listings found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
