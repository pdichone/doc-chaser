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
export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string; debug?: unknown }> {
  try {
    const fromEmail = process.env.CLICKSEND_FROM_EMAIL || 'noreply@smartdocchaser.com'
    const fromName = process.env.CLICKSEND_FROM_NAME || 'Smart Doc Chaser'

    console.log('Sending Email to:', to, 'from:', fromEmail)

    const response = await fetch(`${CLICKSEND_API_BASE}/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
      },
      body: JSON.stringify({
        to: [{ email: to }],
        from: {
          email_address_id: null,
          name: fromName,
          email: fromEmail,
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
  return `Hi ${clientName}, please upload your ${documentType} here: ${uploadLink}`
}

export function getClientEmailTemplate(
  clientName: string,
  documentType: string,
  uploadLink: string
): { subject: string; body: string } {
  return {
    subject: `Document Request: ${documentType}`,
    body: `Hi ${clientName},

Your insurance broker has requested the following document:
${documentType}

Please click the link below to upload:
${uploadLink}

Thank you!

- Smart Doc Chaser`,
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
  if (isUrgent) {
    return `URGENT: ${clientName}, your ${documentType} is due soon. Please upload now: ${uploadLink}`
  }
  return `Reminder: ${clientName}, please upload your ${documentType}: ${uploadLink}`
}

export function getReminderEmailTemplate(
  clientName: string,
  documentType: string,
  uploadLink: string,
  isUrgent: boolean = false
): { subject: string; body: string } {
  const urgentPrefix = isUrgent ? 'URGENT: ' : ''
  return {
    subject: `${urgentPrefix}Reminder: ${documentType} needed`,
    body: `Hi ${clientName},

${isUrgent ? 'This is an urgent reminder - your deadline is approaching!' : 'This is a friendly reminder.'}

We still need your ${documentType}.

Please click the link below to upload:
${uploadLink}

Thank you!

- Smart Doc Chaser`,
  }
}
