'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { DocumentRequest, DocumentStatus } from '@/lib/types'
import Link from 'next/link'

function StatusBadge({ status }: { status: DocumentStatus }) {
  const styles = {
    pending: 'status-badge status-pending',
    completed: 'status-badge status-completed',
    expired: 'status-badge status-expired',
  }

  const labels = {
    pending: 'Pending',
    completed: 'Completed',
    expired: 'Expired',
  }

  return <span className={styles[status]}>{labels[status]}</span>
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(dateString: string | null): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function TrackerPage() {
  const [requests, setRequests] = useState<DocumentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | DocumentStatus>('all')

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('document_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw new Error('Failed to load requests')
      }

      // Sort: pending first, then by date
      const sorted = (data || []).sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1
        if (a.status !== 'pending' && b.status === 'pending') return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      setRequests(sorted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const copyLink = async (link: string, id: string) => {
    await navigator.clipboard.writeText(link)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const completedCount = requests.filter((r) => r.status === 'completed').length

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-trust-blue mb-1">
              Doc Tracker
            </h1>
            <p className="text-gray-600">
              Track all document requests and their status
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3">
            <button
              onClick={fetchRequests}
              className="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Refresh
            </button>
            <Link href="/request" className="btn btn-primary">
              + New Request
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="card text-center">
            <p className="text-3xl font-bold text-gray-900">{requests.length}</p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-accent-orange">{pendingCount}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-health-green">{completedCount}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-red-500">
              {requests.filter((r) => r.status === 'expired').length}
            </p>
            <p className="text-sm text-gray-500">Expired</p>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6 flex gap-2">
          {(['all', 'pending', 'completed', 'expired'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-trust-blue text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-trust-blue mx-auto mb-4"></div>
            <p className="text-gray-600">Loading requests...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && requests.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-4xl mb-4">📄</p>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No requests yet
            </h2>
            <p className="text-gray-600 mb-6">
              Create your first document request to get started.
            </p>
            <Link href="/request" className="btn btn-primary inline-block">
              Create Request
            </Link>
          </div>
        )}

        {/* Table */}
        {!loading && requests.length > 0 && (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                      Client
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                      Document
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                      Status
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                      Created
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                      Deadline
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {req.client_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {req.client_phone}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {req.document_type}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">{formatDate(req.created_at)}</p>
                        <p className="text-sm text-gray-500">
                          {formatTime(req.created_at)}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(req.deadline)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {req.status === 'pending' && req.upload_link && (
                            <button
                              onClick={() => copyLink(req.upload_link!, req.id)}
                              className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                            >
                              {copiedId === req.id ? 'Copied!' : 'Copy Link'}
                            </button>
                          )}
                          {req.status === 'completed' && req.file_url && (
                            <a
                              href={req.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm px-3 py-1 rounded bg-health-green/10 hover:bg-health-green/20 text-health-green"
                            >
                              View File
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-trust-blue hover:underline text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
}
