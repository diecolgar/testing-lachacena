'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Category, Listing } from '@/lib/types'

export default function EditListingPage() {
  const params = useParams()
  const id = params.id as string
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category_id: '',
    condition: '',
    location: '',
    images: '',
    status: 'active',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('listings').select('*').eq('id', id).single(),
    ]).then(([{ data: cats }, { data: listing }]) => {
      if (cats) setCategories(cats)
      if (listing) {
        const l = listing as unknown as Listing
        setForm({
          title: l.title,
          description: l.description,
          price: String(l.price),
          category_id: l.category_id ? String(l.category_id) : '',
          condition: l.condition ?? '',
          location: l.location ?? '',
          images: l.images?.join(', ') ?? '',
          status: l.status,
        })
      }
    })
  }, [id])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const images = form.images ? form.images.split(',').map(s => s.trim()).filter(Boolean) : []

    const { error } = await supabase.from('listings').update({
      title: form.title,
      description: form.description,
      price: parseFloat(form.price),
      category_id: form.category_id ? parseInt(form.category_id) : null,
      condition: form.condition || null,
      location: form.location || null,
      images,
      status: form.status as Listing['status'],
    }).eq('id', id)

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(`/listings/${id}`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit listing</h1>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Title *</label>
            <input type="text" className="input" value={form.title} onChange={set('title')} required maxLength={100} />
          </div>
          <div>
            <label className="label">Description *</label>
            <textarea className="input min-h-[120px] resize-y" value={form.description} onChange={set('description')} required maxLength={2000} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Price (USD) *</label>
              <input type="number" className="input" value={form.price} onChange={set('price')} required min="0" step="0.01" />
            </div>
            <div>
              <label className="label">Condition</label>
              <select className="input" value={form.condition} onChange={set('condition')}>
                <option value="">Select condition</option>
                <option value="new">New</option>
                <option value="like_new">Like New</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category_id} onChange={set('category_id')}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Location</label>
              <input type="text" className="input" value={form.location} onChange={set('location')} placeholder="City, State" />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={set('status')}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="removed">Removed</option>
            </select>
          </div>
          <div>
            <label className="label">Image URLs (comma-separated)</label>
            <input type="text" className="input" value={form.images} onChange={set('images')} />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
