import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Storage bucket name
export const STORAGE_BUCKET = 'client-documents'

// Helper to get public URL for a file
export function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// Helper to upload a file
export async function uploadFile(
  file: File,
  path: string
): Promise<{ path: string; error: Error | null }> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    return { path: '', error }
  }

  return { path: data.path, error: null }
}

// Helper to fetch document request by upload token
export async function getRequestByToken(token: string) {
  const { data, error } = await supabase
    .from('document_requests')
    .select('*')
    .eq('upload_token', token)
    .eq('status', 'pending')
    .single()

  return { data, error }
}

// Helper to mark request as completed
export async function markRequestCompleted(
  id: string,
  fileUrl: string
) {
  const { data, error } = await supabase
    .from('document_requests')
    .update({
      status: 'completed',
      file_url: fileUrl,
      uploaded_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}
