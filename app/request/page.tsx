'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DOCUMENT_TYPES } from '@/lib/types'
import Link from 'next/link'

export default function RequestPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadLink, setUploadLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    document_type: DOCUMENT_TYPES[0],
    deadline: '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate phone number (basic validation)
      const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/
      if (!phoneRegex.test(formData.client_phone)) {
        throw new Error('Please enter a valid phone number')
      }

      // Insert into Supabase - upload_token is auto-generated
      const { data, error: insertError } = await supabase
        .from('document_requests')
        .insert({
          client_name: formData.client_name.trim(),
          client_phone: formData.client_phone.trim(),
          client_email: formData.client_email.trim() || null,
          document_type: formData.document_type,
          deadline: formData.deadline || null,
          status: 'pending',
        })
        .select()
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        throw new Error('Failed to create request. Please try again.')
      }

      // Build upload link
      const baseUrl = window.location.origin
      const link = `${baseUrl}/upload/${data.upload_token}`

      // Update the record with the upload link
      await supabase
        .from('document_requests')
        .update({ upload_link: link })
        .eq('id', data.id)

      setUploadLink(link)

      // Trigger n8n webhook if configured (for SMS sending)
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_CREATE_REQUEST_WEBHOOK
      if (webhookUrl) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request_id: data.id,
            client_name: formData.client_name,
            client_phone: formData.client_phone,
            client_email: formData.client_email,
            document_type: formData.document_type,
            deadline: formData.deadline,
            upload_link: link,
            upload_token: data.upload_token,
          }),
        }).catch(() => {
          // Non-critical if webhook fails
          console.log('Webhook not configured or failed')
        })
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (uploadLink) {
      await navigator.clipboard.writeText(uploadLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleNewRequest = () => {
    setSuccess(false)
    setUploadLink(null)
    setFormData({
      client_name: '',
      client_phone: '',
      client_email: '',
      document_type: DOCUMENT_TYPES[0],
      deadline: '',
    })
  }

  if (success && uploadLink) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="card max-w-lg w-full text-center">
          <div className="text-health-green text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Request Created!
          </h1>
          <p className="text-gray-600 mb-6">
            Send this link to <strong>{formData.client_name}</strong> to upload their{' '}
            <strong>{formData.document_type}</strong>.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 mb-2">Upload Link:</p>
            <p className="text-trust-blue break-all text-sm font-mono">
              {uploadLink}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={copyToClipboard}
              className="btn btn-primary"
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={handleNewRequest}
              className="btn bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              New Request
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <Link
              href="/tracker"
              className="text-trust-blue hover:underline text-sm"
            >
              View all requests in Doc Tracker →
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="card max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-trust-blue mb-2">
            Request Document
          </h1>
          <p className="text-gray-600">
            Enter client details to send them an upload link
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-1">
              Client Name *
            </label>
            <input
              type="text"
              id="client_name"
              name="client_name"
              required
              value={formData.client_name}
              onChange={handleChange}
              placeholder="John Smith"
              className="input"
            />
          </div>

          <div>
            <label htmlFor="client_phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              id="client_phone"
              name="client_phone"
              required
              value={formData.client_phone}
              onChange={handleChange}
              placeholder="+1 (555) 123-4567"
              className="input"
            />
          </div>

          <div>
            <label htmlFor="client_email" className="block text-sm font-medium text-gray-700 mb-1">
              Email (optional)
            </label>
            <input
              type="email"
              id="client_email"
              name="client_email"
              value={formData.client_email}
              onChange={handleChange}
              placeholder="john@example.com"
              className="input"
            />
          </div>

          <div>
            <label htmlFor="document_type" className="block text-sm font-medium text-gray-700 mb-1">
              Document Type *
            </label>
            <select
              id="document_type"
              name="document_type"
              required
              value={formData.document_type}
              onChange={handleChange}
              className="input"
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
              Deadline (optional)
            </label>
            <input
              type="date"
              id="deadline"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className="input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full mt-6"
          >
            {loading ? 'Creating...' : 'Send Request'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <Link
            href="/tracker"
            className="text-trust-blue hover:underline text-sm"
          >
            View Doc Tracker →
          </Link>
        </div>
      </div>
    </main>
  )
}
