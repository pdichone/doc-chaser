import { NextRequest, NextResponse } from 'next/server'
import { sendSMS, sendEmail } from '@/lib/clicksend'

// Simple test endpoint to verify ClickSend is working
// Usage: GET /api/test-clicksend?phone=+1234567890&email=test@example.com
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const phone = searchParams.get('phone')
  const email = searchParams.get('email')

  if (!phone && !email) {
    return NextResponse.json({
      error: 'Provide ?phone=+1234567890 or ?email=test@example.com to test',
      example: '/api/test-clicksend?phone=+1234567890',
    }, { status: 400 })
  }

  const results: {
    sms?: { success: boolean; error?: string; debug?: unknown }
    email?: { success: boolean; error?: string; debug?: unknown }
  } = {}

  // Test SMS
  if (phone) {
    console.log('Testing SMS to:', phone)
    results.sms = await sendSMS(phone, 'Test message from Smart Doc Chaser. If you received this, ClickSend is working!')
  }

  // Test Email
  if (email) {
    console.log('Testing Email to:', email)
    results.email = await sendEmail(
      email,
      'Test Email from Smart Doc Chaser',
      'This is a test email. If you received this, ClickSend email is working!'
    )
  }

  return NextResponse.json({
    message: 'Test complete - check results below and Vercel logs for details',
    results,
    tip: 'If SMS failed, make sure the phone number is added to ClickSend Contacts (free trial limitation)',
  })
}
