'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import { User, Save } from 'lucide-react'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState({ username: '', full_name: '', bio: '', location: '' })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setForm({
          username: data.username ?? '',
          full_name: data.full_name ?? '',
          bio: data.bio ?? '',
          location: data.location ?? '',
        })
      }
    })
  }, [])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        username: form.username,
        full_name: form.full_name || null,
        bio: form.bio || null,
        location: form.location || null,
      })
      .eq('id', profile!.id)

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setLoading(false)
  }

  if (!profile) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
          <User className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`badge ${profile.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>{profile.role}</span>
            {profile.is_verified && <span className="badge bg-green-100 text-green-700">Verified</span>}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Username *</label>
            <input type="text" className="input" value={form.username} onChange={set('username')} required minLength={3} maxLength={30} />
          </div>
          <div>
            <label className="label">Full name</label>
            <input type="text" className="input" value={form.full_name} onChange={set('full_name')} placeholder="Your full name" />
          </div>
          <div>
            <label className="label">Location</label>
            <input type="text" className="input" value={form.location} onChange={set('location')} placeholder="City, Country" />
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea className="input" value={form.bio} onChange={set('bio')} rows={3} maxLength={300} placeholder="Tell buyers and sellers about yourself…" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
          {saved && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">Profile saved!</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            {loading ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
