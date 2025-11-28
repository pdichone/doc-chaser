import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendSMS,
  sendEmail,
  getReminderSMSTemplate,
  getReminderEmailTemplate,
  getBrokerSMSTemplate,
  getBrokerEmailTemplate,
} from '@/lib/clicksend'

// Create a server-side Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function GET(request: NextRequest) {
  // Verify cron secret (optional but recommended for security)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseClient()
  const now = new Date()
  const results = {
    processed: 0,
    reminders_sent: 0,
    expired: 0,
    errors: [] as string[],
  }

  try {
    // Fetch all pending requests
    const { data: pendingRequests, error: fetchError } = await supabase
      .from('document_requests')
      .select('*')
      .eq('status', 'pending')
      .eq('reminders_stopped', false)

    if (fetchError) {
      throw new Error(`Failed to fetch requests: ${fetchError.message}`)
    }

    if (!pendingRequests || pendingRequests.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending requests to process',
        results,
      })
    }

    const brokerPhone = process.env.BROKER_PHONE
    const brokerEmail = process.env.BROKER_EMAIL
    const trackerUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/tracker`
      : '/tracker'

    for (const req of pendingRequests) {
      results.processed++

      const createdAt = new Date(req.created_at)
      const lastReminder = req.last_reminder_at ? new Date(req.last_reminder_at) : null
      const deadline = req.deadline ? new Date(req.deadline) : null

      // Calculate time differences
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
      const hoursSinceLastReminder = lastReminder
        ? (now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60)
        : Infinity
      const hoursUntilDeadline = deadline
        ? (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
        : Infinity

      // Check if past deadline -> mark expired
      if (deadline && hoursUntilDeadline < 0) {
        const { error: updateError } = await supabase
          .from('document_requests')
          .update({ status: 'expired' })
          .eq('id', req.id)

        if (!updateError) {
          results.expired++

          // Notify broker of expiration
          if (brokerPhone) {
            await sendSMS(brokerPhone, `Request expired: ${req.client_name}'s ${req.document_type} was not uploaded by deadline.`)
          }
          if (brokerEmail) {
            await sendEmail(brokerEmail, `Request Expired: ${req.document_type}`, `${req.client_name}'s ${req.document_type} request has expired. The deadline has passed.`)
          }
        }
        continue
      }

      // Determine if we should send a reminder
      let shouldRemind = false
      let isUrgent = false

      // Rule 1: 48 hours since creation and no reminder sent yet
      if (hoursSinceCreation >= 48 && !lastReminder) {
        shouldRemind = true
      }

      // Rule 2: 24 hours since last reminder (don't spam)
      if (lastReminder && hoursSinceLastReminder >= 24) {
        shouldRemind = true
      }

      // Rule 3: 24 hours before deadline -> urgent reminder
      if (deadline && hoursUntilDeadline <= 24 && hoursUntilDeadline > 0) {
        shouldRemind = true
        isUrgent = true
      }

      if (!shouldRemind) {
        continue
      }

      // Send reminder to client
      const uploadLink = req.upload_link || `${process.env.NEXT_PUBLIC_APP_URL}/upload/${req.upload_token}`

      try {
        // Send SMS
        const smsMessage = getReminderSMSTemplate(req.client_name, req.document_type, uploadLink, isUrgent)
        await sendSMS(req.client_phone, smsMessage)

        // Send Email if available
        if (req.client_email) {
          const emailTemplate = getReminderEmailTemplate(req.client_name, req.document_type, uploadLink, isUrgent)
          await sendEmail(req.client_email, emailTemplate.subject, emailTemplate.body)
        }

        // Update last_reminder_at
        await supabase
          .from('document_requests')
          .update({ last_reminder_at: now.toISOString() })
          .eq('id', req.id)

        results.reminders_sent++
      } catch (sendError) {
        results.errors.push(`Failed to send reminder for ${req.id}: ${sendError}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} requests`,
      results,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        results,
      },
      { status: 500 }
    )
  }
}
