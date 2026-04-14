'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/lib/types'

export default function NewListingPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState({
    title: '', description: '', price: '', category_id: '',
    condition: '', location: '', images: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    supabaseRef.current.from('categories').select('*').order('name').then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: { user } } = await supabaseRef.current.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const images = form.images
        ? form.images.split(',').map(s => s.trim()).filter(Boolean)
        : []

      const { data, error } = await supabaseRef.current.from('listings').insert({
        seller_id: user.id,
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
        category_id: form.category_id ? parseInt(form.category_id) : null,
        condition: form.condition || null,
        location: form.location || null,
        images,
      }).select().single()

      if (error) {
        setError(error.message)
      } else {
        router.push(`/listings/${data.id}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create listing</h1>
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Title *</label>
            <input type="text" className="input" value={form.title} onChange={set('title')} required maxLength={100} placeholder="What are you selling?" />
          </div>
          <div>
            <label className="label">Description *</label>
            <textarea className="input min-h-[120px] resize-y" value={form.description} onChange={set('description')} required maxLength={2000} placeholder="Describe the item, its condition, any defects..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Price (USD) *</label>
              <input type="number" className="input" value={form.price} onChange={set('price')} required min="0" step="0.01" placeholder="0.00" />
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
            <label className="label">Image URLs</label>
            <input type="text" className="input" value={form.images} onChange={set('images')} placeholder="https://..., https://... (comma-separated)" />
            <p className="text-xs text-gray-400 mt-1">Enter one or more image URLs separated by commas</p>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Publishing…' : 'Publish listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
