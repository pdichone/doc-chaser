'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, STORAGE_BUCKET, getPublicUrl, markRequestCompleted } from '@/lib/supabase'
import type { DocumentRequest } from '@/lib/types'

interface UploadPageProps {
  params: { token: string }
}

export default function UploadPage({ params }: UploadPageProps) {
  const { token } = params
  const [request, setRequest] = useState<DocumentRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    async function fetchRequest() {
      const { data, error } = await supabase
        .from('document_requests')
        .select('*')
        .eq('upload_token', token)
        .single()

      if (error || !data) {
        setError('This upload link is invalid or has expired.')
        setLoading(false)
        return
      }

      if (data.status === 'completed') {
        setError('This document has already been uploaded.')
        setLoading(false)
        return
      }

      if (data.status === 'expired') {
        setError('This upload request has expired.')
        setLoading(false)
        return
      }

      setRequest(data)
      setLoading(false)
    }

    fetchRequest()
  }, [token])

  const handleUpload = useCallback(async (file: File) => {
    if (!request) return

    setUploading(true)
    setError(null)

    try {
      // Create sanitized filename
      const clientName = request.client_name.replace(/\s+/g, '')
      const docType = request.document_type.replace(/[\s\/]+/g, '')
      const date = new Date().toISOString().split('T')[0]
      const ext = file.name.split('.').pop() || 'pdf'
      const filename = `${clientName}_${docType}_${date}.${ext}`

      // Upload path: clients/{client_name}/{doc_type}/{filename}
      const path = `clients/${clientName}/${docType}/${filename}`

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get public URL
      const fileUrl = getPublicUrl(path)

      // Update request status
      const { error: updateError } = await markRequestCompleted(request.id, fileUrl)

      if (updateError) {
        throw new Error('File uploaded but failed to update status.')
      }

      // Trigger n8n webhook for processing (optional)
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_PROCESS_UPLOAD_WEBHOOK
      if (webhookUrl) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request_id: request.id,
            upload_token: token,
            file_url: fileUrl,
            client_name: request.client_name,
            document_type: request.document_type,
          }),
        }).catch(() => {
          // Non-critical, don't block success
        })
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [request, token])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0])
    }
  }, [handleUpload])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0])
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-trust-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    )
  }

  if (error && !request) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="card max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </main>
    )
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="card max-w-md text-center">
          <div className="text-health-green text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600">
            Your document has been uploaded successfully.
            <br />
            Your broker has been notified.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="card max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-trust-blue mb-2">
            Upload Document
          </h1>
          <p className="text-gray-600">
            Please upload your <strong>{request?.document_type}</strong>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            dragActive
              ? 'border-trust-blue bg-trust-blue/5'
              : 'border-gray-300 hover:border-trust-blue'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-trust-blue mx-auto mb-4"></div>
              <p className="text-gray-600">Uploading...</p>
            </div>
          ) : (
            <>
              <div className="text-4xl mb-4">📄</div>
              <p className="text-gray-600 mb-4">
                Drag and drop your file here, or
              </p>
              <label className="btn btn-primary cursor-pointer inline-block">
                Choose File
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileChange}
                />
              </label>
              <p className="text-sm text-gray-400 mt-4">
                Accepted: PDF, JPG, PNG, DOC
              </p>
            </>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Client: {request?.client_name}</p>
        </div>
      </div>
    </main>
  )
}
