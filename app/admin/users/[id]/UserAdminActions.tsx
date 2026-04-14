'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  currentRole: string
  isVerified: boolean
  isSelf: boolean
}

export default function UserAdminActions({ userId, currentRole, isVerified, isSelf }: Props) {
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const updateProfile = async (updates: Record<string, unknown>, key: string) => {
    setLoading(key)
    setError('')
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
    if (error) setError(error.message)
    else router.refresh()
    setLoading('')
  }

  return (
    <div className="card p-4 border-amber-200 bg-amber-50/30">
      <h3 className="font-semibold text-gray-900 mb-3 text-sm">Admin Actions</h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => updateProfile({ is_verified: !isVerified }, 'verify')}
          disabled={!!loading}
          className={isVerified ? 'btn-secondary text-sm' : 'btn-primary text-sm'}
        >
          {loading === 'verify' ? '…' : isVerified ? 'Revoke verification' : 'Verify user'}
        </button>

        {!isSelf && (
          <button
            onClick={() => updateProfile({ role: currentRole === 'admin' ? 'user' : 'admin' }, 'role')}
            disabled={!!loading}
            className={currentRole === 'admin' ? 'btn-danger text-sm' : 'btn-secondary text-sm border-amber-300 text-amber-700 hover:bg-amber-50'}
          >
            {loading === 'role' ? '…' : currentRole === 'admin' ? 'Remove admin role' : 'Grant admin role'}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  )
}
