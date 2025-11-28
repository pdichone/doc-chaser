import { NextRequest, NextResponse } from 'next/server'
import {
  sendSMS,
  sendEmail,
  getBrokerSMSTemplate,
  getBrokerEmailTemplate,
} from '@/lib/clicksend'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      client_name,
      document_type,
    } = body

    // Validate required fields
    if (!client_name || !document_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get broker contact info from environment
    const brokerPhone = process.env.BROKER_PHONE
    const brokerEmail = process.env.BROKER_EMAIL
    const trackerUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/tracker`
      : '/tracker'

    if (!brokerPhone && !brokerEmail) {
      console.warn('No broker contact info configured')
      return NextResponse.json({
        success: false,
        error: 'No broker contact info configured',
      }, { status: 400 })
    }

    const results = {
      sms: { sent: false, error: null as string | null },
      email: { sent: false, error: null as string | null },
    }

    // Send SMS to broker (if phone configured)
    if (brokerPhone) {
      const smsMessage = getBrokerSMSTemplate(client_name, document_type)
      const smsResult = await sendSMS(brokerPhone, smsMessage)
      results.sms.sent = smsResult.success
      results.sms.error = smsResult.error || null
    }

    // Send Email to broker (if email configured)
    if (brokerEmail) {
      const emailTemplate = getBrokerEmailTemplate(client_name, document_type, trackerUrl)
      const emailResult = await sendEmail(
        brokerEmail,
        emailTemplate.subject,
        emailTemplate.body
      )
      results.email.sent = emailResult.success
      results.email.error = emailResult.error || null
    }

    // Return results
    const anySuccessful = results.sms.sent || results.email.sent

    return NextResponse.json({
      success: anySuccessful,
      results,
    }, {
      status: anySuccessful ? 200 : 500
    })
  } catch (error) {
    console.error('Notify broker error:', error)
    return NextResponse.json(
      { error: 'Failed to notify broker' },
      { status: 500 }
    )
  }
}
