// ClickSend API Helper Functions
// Docs: https://developers.clicksend.com/docs/rest/v3/

const CLICKSEND_API_BASE = 'https://rest.clicksend.com/v3'

// Get Basic Auth header
function getAuthHeader(): string {
  const username = process.env.CLICKSEND_USERNAME
  const apiKey = process.env.CLICKSEND_API_KEY

  if (!username || !apiKey) {
    throw new Error('ClickSend credentials not configured')
  }

  const credentials = Buffer.from(`${username}:${apiKey}`).toString('base64')
  return `Basic ${credentials}`
}

// Send SMS message
export async function sendSMS(
  to: string,
  message: string
): Promise<{ success: boolean; error?: string; debug?: unknown }> {
  try {
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = to.replace(/[\s\-\(\)]/g, '')

    console.log('Sending SMS to:', normalizedPhone)

    const response = await fetch(`${CLICKSEND_API_BASE}/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
      },
      body: JSON.stringify({
        messages: [
          {
            to: normalizedPhone,
            body: message,
            source: 'DocChaser',
          },
        ],
        // Enable URL shortening - converts URLs to smsu.io/xxxxxx format
        // This also enables click tracking
        shorten_urls: true,
      }),
    })

    const data = await response.json()
    console.log('ClickSend SMS response:', JSON.stringify(data, null, 2))

    if (!response.ok) {
      console.error('ClickSend SMS error:', data)
      return { success: false, error: data.response_msg || 'SMS failed', debug: data }
    }

    // Check if message was sent successfully
    const messageResult = data.data?.messages?.[0]
    if (messageResult?.status !== 'SUCCESS') {
      return {
        success: false,
        error: messageResult?.status || 'SMS failed',
        debug: { messageResult, fullResponse: data }
      }
    }

    return { success: true, debug: data }
  } catch (error) {
    console.error('SMS send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: { caught: String(error) }
    }
  }
}

// Send Email
// NOTE: ClickSend requires you to set up an email address in their dashboard first
// Go to: ClickSend Dashboard -> Email -> Settings -> Email Addresses -> Add
// Then copy the email_address_id to CLICKSEND_EMAIL_ADDRESS_ID env var
export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string; debug?: unknown }> {
  try {
    const emailAddressIdRaw = process.env.CLICKSEND_EMAIL_ADDRESS_ID
    const fromName = process.env.CLICKSEND_FROM_NAME || 'Smart Doc Chaser'

    // If no email_address_id configured, skip email
    if (!emailAddressIdRaw) {
      console.warn('CLICKSEND_EMAIL_ADDRESS_ID not configured - skipping email')
      return {
        success: false,
        error: 'Email not configured. Set CLICKSEND_EMAIL_ADDRESS_ID in environment variables.',
        debug: { reason: 'missing_email_address_id' }
      }
    }

    // Parse as integer (removes any trailing comments like "32592 #for now")
    const emailAddressId = parseInt(emailAddressIdRaw, 10)

    if (isNaN(emailAddressId)) {
      console.error('CLICKSEND_EMAIL_ADDRESS_ID must be a number, got:', emailAddressIdRaw)
      return {
        success: false,
        error: 'CLICKSEND_EMAIL_ADDRESS_ID must be a numeric ID from ClickSend dashboard',
        debug: { reason: 'invalid_email_address_id', value: emailAddressIdRaw }
      }
    }

    console.log('Sending Email to:', to, 'using email_address_id:', emailAddressId)

    const response = await fetch(`${CLICKSEND_API_BASE}/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
      },
      body: JSON.stringify({
        to: [{ email: to, name: to.split('@')[0] }],
        from: {
          email_address_id: emailAddressId,
          name: fromName,
        },
        subject: subject,
        body: body,
      }),
    })

    const data = await response.json()
    console.log('ClickSend Email response:', JSON.stringify(data, null, 2))

    if (!response.ok) {
      console.error('ClickSend Email error:', data)
      return { success: false, error: data.response_msg || 'Email failed', debug: data }
    }

    return { success: true, debug: data }
  } catch (error) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: { caught: String(error) }
    }
  }
}

// Message templates
export function getClientSMSTemplate(
  clientName: string,
  documentType: string,
  uploadLink: string
): string {
  // Keep SMS short (160 char limit) and warm
  // Note: ClickSend trial may strip URLs - upgrade account or verify domain
  const firstName = clientName.split(' ')[0]

  // If link is provided, include it. Otherwise show message without link
  if (uploadLink) {
    return `Hi ${firstName}! Please upload your ${documentType}: ${uploadLink}`
  }
  return `Hi ${firstName}! Your broker needs your ${documentType}. Check your email for the upload link.`
}

export function getClientEmailTemplate(
  clientName: string,
  documentType: string,
  uploadLink: string
): { subject: string; body: string } {
  const firstName = clientName.split(' ')[0]
  return {
    subject: `Action Needed: ${documentType}`,
    body: `Hi ${firstName},

Hope you're doing well! Your insurance broker needs a quick document from you.

Document needed: ${documentType}

Uploading is easy - just click the link below:
${uploadLink || '[link not available]'}

This only takes a minute and helps us get your coverage sorted faster.

Thanks so much!
Your Insurance Team`,
  }
}

export function getBrokerSMSTemplate(
  clientName: string,
  documentType: string
): string {
  return `Document uploaded! ${clientName} submitted their ${documentType}.`
}

export function getBrokerEmailTemplate(
  clientName: string,
  documentType: string,
  trackerUrl: string
): { subject: string; body: string } {
  return {
    subject: `Document Received: ${documentType} from ${clientName}`,
    body: `${clientName} has uploaded their ${documentType}.

View all requests: ${trackerUrl}

- Smart Doc Chaser`,
  }
}

export function getReminderSMSTemplate(
  clientName: string,
  documentType: string,
  uploadLink: string,
  isUrgent: boolean = false
): string {
  const firstName = clientName.split(' ')[0]
  if (isUrgent) {
    return `Hi ${firstName}! Quick reminder - we still need your ${documentType} soon. Upload here: ${uploadLink || '[link]'}`
  }
  return `Hi ${firstName}! Friendly reminder - we still need your ${documentType}. Upload here: ${uploadLink || '[link]'}`
}

export function getReminderEmailTemplate(
  clientName: string,
  documentType: string,
  uploadLink: string,
  isUrgent: boolean = false
): { subject: string; body: string } {
  const firstName = clientName.split(' ')[0]
  const urgentPrefix = isUrgent ? 'Time Sensitive: ' : 'Friendly Reminder: '
  return {
    subject: `${urgentPrefix}${documentType} still needed`,
    body: `Hi ${firstName},

${isUrgent ? 'Just a quick heads up - the deadline for your document is coming up soon!' : 'Hope you\'re having a great day! Just a friendly nudge.'}

We still need your ${documentType} to move forward with your coverage.

Click here to upload (takes less than a minute):
${uploadLink || '[link not available]'}

If you have any questions, just reply to this email.

Thanks!
Your Insurance Team`,
  }
}
