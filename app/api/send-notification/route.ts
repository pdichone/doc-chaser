import { NextRequest, NextResponse } from 'next/server'
import {
  sendSMS,
  sendEmail,
  getClientSMSTemplate,
  getClientEmailTemplate,
} from '@/lib/clicksend'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      client_name,
      client_phone,
      client_email,
      document_type,
      upload_link,
    } = body

    // Log received data for debugging
    console.log('Notification request received:', {
      client_name,
      client_phone,
      client_email,
      document_type,
      upload_link,
      upload_link_length: upload_link?.length,
    })

    // Validate required fields
    if (!client_name || !client_phone || !document_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Warn if upload_link is missing but continue
    if (!upload_link) {
      console.warn('WARNING: upload_link is missing or empty!')
    }

    const results = {
      sms: { sent: false, error: null as string | null, debug: null as unknown },
      email: { sent: false, error: null as string | null, debug: null as unknown },
    }

    // Send SMS (always required)
    const smsMessage = getClientSMSTemplate(client_name, document_type, upload_link)
    console.log('SMS message to send:', smsMessage)
    console.log('SMS message length:', smsMessage.length)
    const smsResult = await sendSMS(client_phone, smsMessage)
    results.sms.sent = smsResult.success
    results.sms.error = smsResult.error || null
    results.sms.debug = { apiResponse: smsResult.debug, messageSent: smsMessage }

    // Send Email (if provided)
    if (client_email) {
      const emailTemplate = getClientEmailTemplate(client_name, document_type, upload_link)
      const emailResult = await sendEmail(
        client_email,
        emailTemplate.subject,
        emailTemplate.body
      )
      results.email.sent = emailResult.success
      results.email.error = emailResult.error || null
      results.email.debug = emailResult.debug || null
    }

    // Return results
    const allSuccessful = results.sms.sent && (!client_email || results.email.sent)

    return NextResponse.json({
      success: allSuccessful,
      results,
    }, {
      status: allSuccessful ? 200 : 207 // 207 = partial success
    })
  } catch (error) {
    console.error('Send notification error:', error)
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    )
  }
}
