import nodemailer from 'nodemailer'

// Email configuration from environment variables
// For cPanel email, typically use mail.yourdomain.com or yourdomain.com
const emailConfig = {
  host: process.env.SMTP_HOST || 'mail.3iconic.co.ke',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465 (SSL), false for 587 (TLS)
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
}

// Create transporter function (lazy initialization)
function getTransporter() {
  // Re-read config in case env vars changed
  const config = {
    host: process.env.SMTP_HOST || 'mail.3iconic.co.ke',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || '',
    },
  }

  // Log the configuration being used (without password)
  console.log(`[Email] Attempting SMTP connection to ${config.host}:${config.port} (secure: ${config.secure})`)

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure, // true for 465 (SSL), false for 587 (TLS)
    auth: config.auth,
    connectionTimeout: 15000, // 15 seconds timeout
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      // Do not fail on invalid certs (common with cPanel servers)
      rejectUnauthorized: false,
      // Allow older TLS versions for compatibility
      minVersion: 'TLSv1',
    },
    // For cPanel email servers - require TLS for port 587
    requireTLS: !config.secure,
    // Retry connection
    pool: false,
    // Additional options for better compatibility
    debug: process.env.NODE_ENV === 'development', // Enable debug logging in development
    logger: process.env.NODE_ENV === 'development', // Enable logger in development
  })
}

// Verify connection configuration
export async function verifyEmailConnection() {
  try {
    const transporter = getTransporter()
    await transporter.verify()
    return { success: true, message: 'Email server is ready' }
  } catch (error) {
    console.error('Email verification failed:', error)
    return { 
      success: false, 
      message: 'Email server connection failed', 
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Send job application email
export async function sendJobApplicationEmail(data: {
  jobTitle: string
  fullName: string
  phoneNumber: string
  email: string
  countyTown: string
  yearsExperience: string
  cvFile?: { name: string; content: Buffer; contentType: string }
  certificatesFile?: { name: string; content: Buffer; contentType: string }
}) {
  try {
    // Validate email configuration
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASSWORD
    const smtpHost = process.env.SMTP_HOST

    if (!smtpUser || !smtpPass) {
      throw new Error('Email configuration is missing. Please check SMTP_USER and SMTP_PASSWORD environment variables.')
    }

    if (!smtpHost) {
      throw new Error('SMTP host is not configured. Please check SMTP_HOST environment variable.')
    }
    const { jobTitle, fullName, phoneNumber, email, countyTown, yearsExperience, cvFile, certificatesFile } = data

    // Email subject
    const subject = `New Job Application: ${jobTitle} - ${fullName}`

    // Email body (HTML)
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0B6B3A 0%, #22C55E 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #0B6B3A; margin-bottom: 5px; display: block; }
            .value { color: #333; }
            .footer { background: #f3f4f6; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">New Job Application</h2>
            </div>
            <div class="content">
              <div class="field">
                <span class="label">Position Applied For:</span>
                <span class="value">${jobTitle}</span>
              </div>
              <div class="field">
                <span class="label">Full Name:</span>
                <span class="value">${fullName}</span>
              </div>
              <div class="field">
                <span class="label">Phone Number:</span>
                <span class="value">${phoneNumber}</span>
              </div>
              <div class="field">
                <span class="label">Email:</span>
                <span class="value">${email}</span>
              </div>
              <div class="field">
                <span class="label">County / Town:</span>
                <span class="value">${countyTown}</span>
              </div>
              <div class="field">
                <span class="label">Years of Experience:</span>
                <span class="value">${yearsExperience}</span>
              </div>
              ${cvFile ? `
              <div class="field">
                <span class="label">CV/Resume:</span>
                <span class="value">${cvFile.name} (attached)</span>
              </div>
              ` : ''}
              ${certificatesFile ? `
              <div class="field">
                <span class="label">Certificates:</span>
                <span class="value">${certificatesFile.name} (attached)</span>
              </div>
              ` : ''}
            </div>
            <div class="footer">
              <p>This application was submitted through the Iconic Fibre careers portal.</p>
              <p>Please review and respond to the candidate at ${email} or ${phoneNumber}.</p>
            </div>
          </div>
        </body>
      </html>
    `

    // Plain text version
    const textBody = `
New Job Application

Position Applied For: ${jobTitle}
Full Name: ${fullName}
Phone Number: ${phoneNumber}
Email: ${email}
County / Town: ${countyTown}
Years of Experience: ${yearsExperience}
${cvFile ? `CV/Resume: ${cvFile.name} (attached)` : ''}
${certificatesFile ? `Certificates: ${certificatesFile.name} (attached)` : ''}

This application was submitted through the Iconic Fibre careers portal.
Please review and respond to the candidate at ${email} or ${phoneNumber}.
    `

    // Prepare attachments as proper file attachments
    const attachments: nodemailer.Attachment[] = []
    if (cvFile) {
      // Ensure content is a Buffer
      const fileBuffer = Buffer.isBuffer(cvFile.content) 
        ? cvFile.content 
        : Buffer.from(cvFile.content)
      
      // Create attachment with proper encoding - nodemailer will handle base64 encoding automatically
      attachments.push({
        filename: cvFile.name,
        content: fileBuffer, // Buffer will be automatically encoded as base64 by nodemailer
        contentType: 'application/pdf',
        // Don't set contentDisposition explicitly - nodemailer handles this
        // Setting it might interfere with proper MIME formatting
      })
      console.log(`[Email] ✅ CV attachment prepared: ${cvFile.name} (${(fileBuffer.length / 1024).toFixed(2)} KB)`)
    }
    if (certificatesFile) {
      // Ensure content is a Buffer
      const certBuffer = Buffer.isBuffer(certificatesFile.content)
        ? certificatesFile.content
        : Buffer.from(certificatesFile.content)
      
      // Determine content type based on file extension
      const certContentType = certificatesFile.contentType || 
        (certificatesFile.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' :
         certificatesFile.name.toLowerCase().endsWith('.jpg') || certificatesFile.name.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' :
         certificatesFile.name.toLowerCase().endsWith('.png') ? 'image/png' :
         'application/octet-stream')
      
      attachments.push({
        filename: certificatesFile.name,
        content: certBuffer,
        contentType: certContentType,
        // Don't set contentDisposition explicitly - nodemailer handles this
      })
      console.log(`[Email] ✅ Certificates attachment prepared: ${certificatesFile.name} (${(certBuffer.length / 1024).toFixed(2)} KB)`)
    }

    // Get transporter (lazy initialization)
    const transporter = getTransporter()

    // Get recipient email
    const recipientEmail = process.env.CAREERS_EMAIL || 'careers@3iconic.co.ke'
    
    console.log(`[Email] Sending to: ${recipientEmail}`)
    console.log(`[Email] From: ${smtpUser}`)
    console.log(`[Email] Attachments: ${attachments.length} file(s)`)
    if (cvFile) console.log(`[Email] CV: ${cvFile.name} (${(cvFile.content.length / 1024).toFixed(2)} KB)`)
    if (certificatesFile) console.log(`[Email] Certificates: ${certificatesFile.name} (${(certificatesFile.content.length / 1024).toFixed(2)} KB)`)

    // Send email with proper multipart formatting for attachments
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Iconic Fibre Careers" <${smtpUser}>`,
      to: recipientEmail,
      replyTo: email, // Allow replying directly to the applicant
      subject,
      text: textBody,
      html: htmlBody,
      attachments: attachments.length > 0 ? attachments : undefined, // Only include if there are attachments
      // Add headers to improve deliverability and avoid spam
      headers: {
        'X-Priority': '1', // High priority
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Mailer': 'Iconic Fibre Careers Portal',
        'List-Unsubscribe': `<mailto:${smtpUser}?subject=Unsubscribe>`,
        'Precedence': 'bulk',
        // Ensure proper MIME type for attachments
        'MIME-Version': '1.0',
      },
      // Improve email formatting
      date: new Date(),
      messageId: `<${Date.now()}-${Math.random().toString(36).substring(7)}@3iconic.co.ke>`,
      // Ensure attachments are sent as multipart/mixed
      alternatives: undefined, // Don't use alternatives - use attachments directly
    }

    console.log(`[Email] Mail options prepared with ${attachments.length} attachment(s)`)
    if (attachments.length > 0) {
      attachments.forEach((att, idx) => {
        console.log(`[Email]   Attachment ${idx + 1}: ${att.filename} (${att.contentType}, ${Buffer.isBuffer(att.content) ? (att.content.length / 1024).toFixed(2) + ' KB' : 'unknown size'})`)
      })
    }

    const info = await transporter.sendMail(mailOptions)

    console.log(`[Email] ✅ Email sent successfully!`)
    console.log(`[Email] Message ID: ${info.messageId}`)
    console.log(`[Email] Response: ${info.response}`)
    console.log(`[Email] Recipient: ${recipientEmail}`)
    console.log(`[Email] ⚠️  If you don't see the email, check:`)
    console.log(`[Email]    1. Spam/Junk folder`)
    console.log(`[Email]    2. Wait a few minutes (delivery can be delayed)`)
    console.log(`[Email]    3. Verify email address: ${recipientEmail}`)

    return {
      success: true,
      messageId: info.messageId,
      message: `Application email sent successfully to ${recipientEmail}`,
      recipient: recipientEmail,
      response: info.response,
    }
  } catch (error) {
    console.error('Error sending application email:', error)
    
    // Provide more detailed error information
    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Common error patterns
      if (errorMessage.includes('ECONNREFUSED')) {
        errorMessage = 'Cannot connect to email server. Please check SMTP_HOST and SMTP_PORT settings.'
      } else if (errorMessage.includes('EAUTH')) {
        errorMessage = 'Email authentication failed. Please check SMTP_USER and SMTP_PASSWORD.'
      } else if (errorMessage.includes('ETIMEDOUT')) {
        errorMessage = 'Email server connection timed out. Please check your network and SMTP settings.'
      } else if (errorMessage.includes('ENOTFOUND')) {
        errorMessage = 'Email server hostname not found. Please check SMTP_HOST setting.'
      }
    }
    
    return {
      success: false,
      message: 'Failed to send application email',
      error: errorMessage,
    }
  }
}

// Send open application email
export async function sendOpenApplicationEmail(data: {
  fullName: string
  phoneNumber: string
  email: string
  location: string
  expertise: string[]
  yearsExperience: string
  briefDescription: string
  portfolioLink: string | null
  cvFile?: { name: string; content: Buffer; contentType: string }
  certificatesFile?: { name: string; content: Buffer; contentType: string }
}) {
  try {
    // Validate email configuration
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASSWORD
    const smtpHost = process.env.SMTP_HOST

    if (!smtpUser || !smtpPass) {
      throw new Error(
        'Email configuration is missing. Please check SMTP_USER and SMTP_PASSWORD environment variables.'
      )
    }

    if (!smtpHost) {
      throw new Error('SMTP host is not configured. Please check SMTP_HOST environment variable.')
    }

    const {
      fullName,
      phoneNumber,
      email,
      location,
      expertise,
      yearsExperience,
      briefDescription,
      portfolioLink,
      cvFile,
      certificatesFile,
    } = data

    // Email subject
    const subject = `Open Application: ${fullName} - ${expertise.join(', ')}`

    // Email body (HTML)
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0B6B3A 0%, #22C55E 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 20px; }
            .label { font-weight: bold; color: #0B6B3A; display: block; margin-bottom: 5px; }
            .value { color: #333; }
            .expertise-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px; }
            .tag { background: #22C55E; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">New Open Application</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Talent Pool Submission</p>
            </div>
            <div class="content">
              <div class="field">
                <span class="label">Full Name:</span>
                <span class="value">${fullName}</span>
              </div>
              
              <div class="field">
                <span class="label">Phone Number:</span>
                <span class="value">${phoneNumber}</span>
              </div>
              
              <div class="field">
                <span class="label">Email:</span>
                <span class="value">${email}</span>
              </div>
              
              <div class="field">
                <span class="label">Location:</span>
                <span class="value">${location}</span>
              </div>
              
              <div class="field">
                <span class="label">Area of Expertise:</span>
                <div class="expertise-tags">
                  ${expertise.map((exp) => `<span class="tag">${exp}</span>`).join('')}
                </div>
              </div>
              
              <div class="field">
                <span class="label">Years of Experience:</span>
                <span class="value">${yearsExperience} years</span>
              </div>
              
              <div class="field">
                <span class="label">What They Can Bring:</span>
                <span class="value">${briefDescription}</span>
              </div>
              
              ${portfolioLink ? `
              <div class="field">
                <span class="label">Portfolio / LinkedIn:</span>
                <span class="value"><a href="${portfolioLink}" target="_blank">${portfolioLink}</a></span>
              </div>
              ` : ''}
              
              ${cvFile ? `
              <div class="field">
                <span class="label">CV/Resume:</span>
                <span class="value">${cvFile.name} (attached)</span>
              </div>
              ` : ''}
              
              ${certificatesFile ? `
              <div class="field">
                <span class="label">Certificates:</span>
                <span class="value">${certificatesFile.name} (attached)</span>
              </div>
              ` : ''}
              
              <div class="footer">
                <p>This open application was submitted through the Iconic Fibre careers portal.</p>
                <p>Please review and add to the talent pool for future opportunities.</p>
                <p>Contact: ${email} or ${phoneNumber}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    // Plain text version
    const textBody = `
New Open Application - Talent Pool Submission

Full Name: ${fullName}
Phone Number: ${phoneNumber}
Email: ${email}
Location: ${location}
Area of Expertise: ${expertise.join(', ')}
Years of Experience: ${yearsExperience} years
What They Can Bring: ${briefDescription}
${portfolioLink ? `Portfolio / LinkedIn: ${portfolioLink}` : ''}
${cvFile ? `CV/Resume: ${cvFile.name} (attached)` : ''}
${certificatesFile ? `Certificates: ${certificatesFile.name} (attached)` : ''}

This open application was submitted through the Iconic Fibre careers portal.
Please review and add to the talent pool for future opportunities.
Contact: ${email} or ${phoneNumber}
    `

    // Prepare attachments
    const attachments: nodemailer.Attachment[] = []
    if (cvFile) {
      const fileBuffer = Buffer.isBuffer(cvFile.content)
        ? cvFile.content
        : Buffer.from(cvFile.content)

      attachments.push({
        filename: cvFile.name,
        content: fileBuffer,
        contentType: 'application/pdf',
      })
      console.log(
        `[Email] ✅ CV attachment prepared: ${cvFile.name} (${(fileBuffer.length / 1024).toFixed(2)} KB)`
      )
    }
    if (certificatesFile) {
      const certBuffer = Buffer.isBuffer(certificatesFile.content)
        ? certificatesFile.content
        : Buffer.from(certificatesFile.content)

      const certContentType =
        certificatesFile.contentType ||
        (certificatesFile.name.toLowerCase().endsWith('.pdf')
          ? 'application/pdf'
          : certificatesFile.name.toLowerCase().endsWith('.jpg') ||
            certificatesFile.name.toLowerCase().endsWith('.jpeg')
          ? 'image/jpeg'
          : certificatesFile.name.toLowerCase().endsWith('.png')
          ? 'image/png'
          : 'application/octet-stream')

      attachments.push({
        filename: certificatesFile.name,
        content: certBuffer,
        contentType: certContentType,
      })
      console.log(
        `[Email] ✅ Certificates attachment prepared: ${certificatesFile.name} (${(certBuffer.length / 1024).toFixed(2)} KB)`
      )
    }

    // Get transporter
    const transporter = getTransporter()

    // Get recipient email
    const recipientEmail = process.env.CAREERS_EMAIL || 'careers@3iconic.co.ke'

    console.log(`[Email] Sending open application to: ${recipientEmail}`)
    console.log(`[Email] From: ${smtpUser}`)
    console.log(`[Email] Attachments: ${attachments.length} file(s)`)

    // Send email
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Iconic Fibre Careers" <${smtpUser}>`,
      to: recipientEmail,
      replyTo: email,
      subject,
      text: textBody,
      html: htmlBody,
      attachments: attachments.length > 0 ? attachments : undefined,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Mailer': 'Iconic Fibre Careers Portal',
        'List-Unsubscribe': `<mailto:${smtpUser}?subject=Unsubscribe>`,
        'Precedence': 'bulk',
        'MIME-Version': '1.0',
      },
      date: new Date(),
      messageId: `<${Date.now()}-${Math.random().toString(36).substring(7)}@3iconic.co.ke>`,
      alternatives: undefined,
    }

    console.log(`[Email] Mail options prepared with ${attachments.length} attachment(s)`)

    const info = await transporter.sendMail(mailOptions)

    console.log(`[Email] ✅ Email sent successfully!`)
    console.log(`[Email] Message ID: ${info.messageId}`)

    return {
      success: true,
      messageId: info.messageId,
      message: `Open application email sent successfully to ${recipientEmail}`,
      recipient: recipientEmail,
      response: info.response,
    }
  } catch (error) {
    console.error('Error sending open application email:', error)

    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message

      if (errorMessage.includes('ECONNREFUSED')) {
        errorMessage =
          'Cannot connect to email server. Please check SMTP_HOST and SMTP_PORT settings.'
      } else if (errorMessage.includes('EAUTH')) {
        errorMessage =
          'Email authentication failed. Please check SMTP_USER and SMTP_PASSWORD.'
      } else if (errorMessage.includes('ETIMEDOUT')) {
        errorMessage =
          'Email server connection timed out. Please check your network and SMTP settings.'
      } else if (errorMessage.includes('ENOTFOUND')) {
        errorMessage = 'Email server hostname not found. Please check SMTP_HOST setting.'
      }
    }

    return {
      success: false,
      message: 'Failed to send open application email',
      error: errorMessage,
    }
  }
}

// Send contact form email
export async function sendContactFormEmail(data: {
  firstName: string
  lastName: string
  email: string
  phone: string
  subject: string
  message: string
}) {
  try {
    // Validate email configuration
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASSWORD
    const smtpHost = process.env.SMTP_HOST

    if (!smtpUser || !smtpPass) {
      throw new Error(
        'Email configuration is missing. Please check SMTP_USER and SMTP_PASSWORD environment variables.'
      )
    }

    if (!smtpHost) {
      throw new Error('SMTP host is not configured. Please check SMTP_HOST environment variable.')
    }

    const { firstName, lastName, email, phone, subject, message } = data

    // Email subject
    const emailSubject = `Contact Form: ${subject}`

    // Email body (HTML) - Modern Premium Design
    const htmlBody = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6; 
              color: #071411; 
              background-color: #F7FAF8;
              padding: 20px;
            }
            .email-wrapper {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(11, 107, 58, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #0B6B3A 0%, #22C55E 100%);
              color: #ffffff;
              padding: 40px 30px;
              text-align: center;
              position: relative;
              overflow: hidden;
            }
            .header::before {
              content: '';
              position: absolute;
              top: -50%;
              right: -50%;
              width: 200%;
              height: 200%;
              background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
              animation: pulse 3s ease-in-out infinite;
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 0.5; }
              50% { transform: scale(1.1); opacity: 0.8; }
            }
            .header-content {
              position: relative;
              z-index: 1;
            }
            .header h1 {
              font-size: 28px;
              font-weight: 700;
              margin: 0 0 8px 0;
              letter-spacing: -0.5px;
            }
            .header p {
              font-size: 14px;
              opacity: 0.95;
              font-weight: 400;
            }
            .content {
              padding: 40px 30px;
              background: #ffffff;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-item {
              background: linear-gradient(to right, #F7FAF8 0%, #ffffff 100%);
              border-left: 4px solid #22C55E;
              padding: 18px 20px;
              border-radius: 8px;
              transition: all 0.3s ease;
            }
            .info-item:hover {
              box-shadow: 0 2px 8px rgba(34, 197, 94, 0.15);
              transform: translateX(2px);
            }
            .info-label {
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #0B6B3A;
              margin-bottom: 6px;
            }
            .info-value {
              font-size: 16px;
              font-weight: 500;
              color: #071411;
              word-break: break-word;
            }
            .info-value a {
              color: #0B6B3A;
              text-decoration: none;
              transition: color 0.2s;
            }
            .info-value a:hover {
              color: #22C55E;
              text-decoration: underline;
            }
            .subject-badge {
              display: inline-block;
              background: linear-gradient(135deg, #0B6B3A 0%, #22C55E 100%);
              color: #ffffff;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              margin-top: 4px;
            }
            .message-section {
              background: linear-gradient(135deg, #F7FAF8 0%, #ffffff 100%);
              border: 2px solid #E5F7ED;
              border-radius: 12px;
              padding: 24px;
              margin-top: 8px;
            }
            .message-label {
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #0B6B3A;
              margin-bottom: 12px;
            }
            .message-content {
              font-size: 15px;
              line-height: 1.8;
              color: #071411;
              white-space: pre-wrap;
            }
            .divider {
              height: 1px;
              background: linear-gradient(to right, transparent, #E5F7ED, transparent);
              margin: 30px 0;
            }
            .footer {
              background: #F7FAF8;
              padding: 24px 30px;
              text-align: center;
              border-top: 1px solid #E5F7ED;
            }
            .footer-text {
              font-size: 12px;
              color: #6B7280;
              line-height: 1.6;
              margin-bottom: 8px;
            }
            .footer-text:last-child {
              margin-bottom: 0;
            }
            .reply-hint {
              background: linear-gradient(135deg, #E5F7ED 0%, #F0FDF4 100%);
              border-left: 4px solid #22C55E;
              padding: 16px 20px;
              border-radius: 8px;
              margin-top: 20px;
              font-size: 13px;
              color: #0B6B3A;
              text-align: center;
            }
            .reply-hint strong {
              font-weight: 600;
            }
            @media only screen and (max-width: 600px) {
              body { padding: 10px; }
              .header { padding: 30px 20px; }
              .header h1 { font-size: 24px; }
              .content { padding: 30px 20px; }
              .footer { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <div class="header-content">
                <h1>📧 New Contact Form Message</h1>
                <p>Iconic Fibre Website Submission</p>
              </div>
            </div>
            
            <div class="content">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">👤 Full Name</div>
                  <div class="info-value">${firstName} ${lastName}</div>
                </div>
                
                <div class="info-item">
                  <div class="info-label">📧 Email Address</div>
                  <div class="info-value">
                    <a href="mailto:${email}">${email}</a>
                  </div>
                </div>
                
                <div class="info-item">
                  <div class="info-label">📱 Phone Number</div>
                  <div class="info-value">
                    <a href="tel:${phone}">${phone}</a>
                  </div>
                </div>
                
                <div class="info-item">
                  <div class="info-label">📌 Subject</div>
                  <div class="subject-badge">${subject}</div>
                </div>
              </div>
              
              <div class="divider"></div>
              
              <div class="info-item">
                <div class="info-label">💬 Message</div>
                <div class="message-section">
                  <div class="message-content">${message.replace(/\n/g, '<br>')}</div>
                </div>
              </div>
              
              <div class="reply-hint">
                <strong>💡 Quick Reply:</strong> Reply directly to this email to respond to ${firstName} ${lastName}
              </div>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                This message was submitted through the Iconic Fibre contact form.
              </p>
              <p class="footer-text">
                Submitted on ${new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    // Plain text version
    const textBody = `
New Contact Form Submission - Iconic Fibre Website

Name: ${firstName} ${lastName}
Email: ${email}
Phone: ${phone}
Subject: ${subject}

Message:
${message}

---
This message was submitted through the Iconic Fibre contact form.
You can reply directly to this email to respond to ${firstName} ${lastName}.
    `

    // Get transporter
    const transporter = getTransporter()

    // Get recipient email
    const recipientEmail = process.env.SUPPORT_EMAIL || 'support@3iconic.co.ke'

    console.log(`[Email] Sending contact form to: ${recipientEmail}`)
    console.log(`[Email] From: ${smtpUser}`)

    // Send email FROM customers@3iconic.co.ke TO support@3iconic.co.ke
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${firstName} ${lastName} (Contact Form)" <${smtpUser}>`, // FROM: customers@3iconic.co.ke
      to: recipientEmail, // TO: support@3iconic.co.ke
      replyTo: email, // Reply-To: customer's email so support can reply directly
      subject: emailSubject,
      text: textBody,
      html: htmlBody,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Mailer': 'Iconic Fibre Contact Form',
        'MIME-Version': '1.0',
      },
      date: new Date(),
      messageId: `<${Date.now()}-${Math.random().toString(36).substring(7)}@3iconic.co.ke>`,
    }

    const info = await transporter.sendMail(mailOptions)

    console.log(`[Email] ✅ Contact form email sent successfully!`)
    console.log(`[Email] Message ID: ${info.messageId}`)

    return {
      success: true,
      messageId: info.messageId,
      message: `Contact form email sent successfully to ${recipientEmail}`,
      recipient: recipientEmail,
      response: info.response,
    }
  } catch (error) {
    console.error('Error sending contact form email:', error)

    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message

      if (errorMessage.includes('ECONNREFUSED')) {
        errorMessage =
          'Cannot connect to email server. Please check SMTP_HOST and SMTP_PORT settings.'
      } else if (errorMessage.includes('EAUTH')) {
        errorMessage =
          'Email authentication failed. Please check SMTP_USER and SMTP_PASSWORD.'
      } else if (errorMessage.includes('ETIMEDOUT')) {
        errorMessage =
          'Email server connection timed out. Please check your network and SMTP settings.'
      } else if (errorMessage.includes('ENOTFOUND')) {
        errorMessage = 'Email server hostname not found. Please check SMTP_HOST setting.'
      }
    }

    return {
      success: false,
      message: 'Failed to send contact form email',
      error: errorMessage,
    }
  }
}

// Send coverage request email
export async function sendCoverageRequestEmail(data: {
  fullName: string
  email: string
  phone: string
  location: string
  message: string | null
}) {
  try {
    // Validate email configuration
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASSWORD
    const smtpHost = process.env.SMTP_HOST

    if (!smtpUser || !smtpPass) {
      throw new Error(
        'Email configuration is missing. Please check SMTP_USER and SMTP_PASSWORD environment variables.'
      )
    }

    if (!smtpHost) {
      throw new Error('SMTP host is not configured. Please check SMTP_HOST environment variable.')
    }

    const { fullName, email, phone, location, message } = data

    // Email subject
    const emailSubject = `Coverage Request: ${location}`

    // Email body (HTML) - Modern Premium Design
    const htmlBody = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', Arial, sans-serif;
              line-height: 1.6; 
              color: #071411; 
              background-color: #F7FAF8;
              padding: 20px;
            }
            .email-wrapper {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(11, 107, 58, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #0B6B3A 0%, #22C55E 100%);
              color: #ffffff;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              font-size: 28px;
              font-weight: 700;
              margin: 0 0 8px 0;
            }
            .header p {
              font-size: 14px;
              opacity: 0.95;
            }
            .content {
              padding: 40px 30px;
              background: #ffffff;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-item {
              background: linear-gradient(to right, #F7FAF8 0%, #ffffff 100%);
              border-left: 4px solid #22C55E;
              padding: 18px 20px;
              border-radius: 8px;
            }
            .info-label {
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #0B6B3A;
              margin-bottom: 6px;
            }
            .info-value {
              font-size: 16px;
              font-weight: 500;
              color: #071411;
            }
            .info-value a {
              color: #0B6B3A;
              text-decoration: none;
            }
            .info-value a:hover {
              color: #22C55E;
              text-decoration: underline;
            }
            .location-badge {
              display: inline-block;
              background: linear-gradient(135deg, #0B6B3A 0%, #22C55E 100%);
              color: #ffffff;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              margin-top: 4px;
            }
            .message-section {
              background: linear-gradient(135deg, #F7FAF8 0%, #ffffff 100%);
              border: 2px solid #E5F7ED;
              border-radius: 12px;
              padding: 24px;
              margin-top: 8px;
            }
            .message-content {
              font-size: 15px;
              line-height: 1.8;
              color: #071411;
              white-space: pre-wrap;
            }
            .divider {
              height: 1px;
              background: linear-gradient(to right, transparent, #E5F7ED, transparent);
              margin: 30px 0;
            }
            .footer {
              background: #F7FAF8;
              padding: 24px 30px;
              text-align: center;
              border-top: 1px solid #E5F7ED;
            }
            .footer-text {
              font-size: 12px;
              color: #6B7280;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <h1>📍 New Coverage Request</h1>
              <p>Iconic Fibre Website</p>
            </div>
            
            <div class="content">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">👤 Full Name</div>
                  <div class="info-value">${fullName}</div>
                </div>
                
                <div class="info-item">
                  <div class="info-label">📧 Email Address</div>
                  <div class="info-value">
                    <a href="mailto:${email}">${email}</a>
                  </div>
                </div>
                
                <div class="info-item">
                  <div class="info-label">📱 Phone Number</div>
                  <div class="info-value">
                    <a href="tel:${phone}">${phone}</a>
                  </div>
                </div>
                
                <div class="info-item">
                  <div class="info-label">📍 Requested Location</div>
                  <div class="location-badge">${location}</div>
                </div>
              </div>
              
              ${message ? `
              <div class="divider"></div>
              
              <div class="info-item">
                <div class="info-label">💬 Additional Message</div>
                <div class="message-section">
                  <div class="message-content">${message.replace(/\n/g, '<br>')}</div>
                </div>
              </div>
              ` : ''}
            </div>
            
            <div class="footer">
              <p class="footer-text">
                This coverage request was submitted through the Iconic Fibre website.
              </p>
              <p class="footer-text">
                Submitted on ${new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    // Plain text version
    const textBody = `
New Coverage Request - Iconic Fibre Website

Full Name: ${fullName}
Email: ${email}
Phone: ${phone}
Requested Location: ${location}
${message ? `\nAdditional Message:\n${message}` : ''}

---
This coverage request was submitted through the Iconic Fibre website.
Submitted on ${new Date().toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}
    `

    // Get transporter
    const transporter = getTransporter()

    // Get recipient email from environment variable
    const recipientEmail = process.env.SUPPORT_EMAIL || 'support@3iconic.co.ke'

    console.log(`[Email] Sending coverage request to: ${recipientEmail}`)
    console.log(`[Email] From: ${smtpUser}`)

    // Send email FROM customers@3iconic.co.ke TO support@3iconic.co.ke
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${fullName} (Coverage Request)" <${smtpUser}>`,
      to: recipientEmail,
      replyTo: email,
      subject: emailSubject,
      text: textBody,
      html: htmlBody,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Mailer': 'Iconic Fibre Contact Form',
        'MIME-Version': '1.0',
      },
      date: new Date(),
      messageId: `<${Date.now()}-${Math.random().toString(36).substring(7)}@3iconic.co.ke>`,
    }

    const info = await transporter.sendMail(mailOptions)

    console.log(`[Email] ✅ Coverage request email sent successfully!`)
    console.log(`[Email] Message ID: ${info.messageId}`)

    return {
      success: true,
      messageId: info.messageId,
      message: `Coverage request email sent successfully to ${recipientEmail}`,
      recipient: recipientEmail,
      response: info.response,
    }
  } catch (error) {
    console.error('Error sending coverage request email:', error)

    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message

      if (errorMessage.includes('ECONNREFUSED')) {
        errorMessage =
          'Cannot connect to email server. Please check SMTP_HOST and SMTP_PORT settings.'
      } else if (errorMessage.includes('EAUTH')) {
        errorMessage =
          'Email authentication failed. Please check SMTP_USER and SMTP_PASSWORD.'
      } else if (errorMessage.includes('ETIMEDOUT')) {
        errorMessage =
          'Email server connection timed out. Please check your network and SMTP settings.'
      } else if (errorMessage.includes('ENOTFOUND')) {
        errorMessage = 'Email server hostname not found. Please check SMTP_HOST setting.'
      }
    }

    return {
      success: false,
      message: 'Failed to send coverage request email',
      error: errorMessage,
    }
  }
}

// Send business quote request email
export async function sendBusinessQuoteEmail(data: {
  companyName: string
  email: string
  phone: string
  requirements: string
}) {
  try {
    // Validate email configuration
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASSWORD
    const smtpHost = process.env.SMTP_HOST

    if (!smtpUser || !smtpPass) {
      throw new Error(
        'Email configuration is missing. Please check SMTP_USER and SMTP_PASSWORD environment variables.'
      )
    }

    if (!smtpHost) {
      throw new Error('SMTP host is not configured. Please check SMTP_HOST environment variable.')
    }

    const { companyName, email, phone, requirements } = data

    // Email subject
    const emailSubject = `Business Quote Request: ${companyName}`

    // Email body (HTML) - Modern Premium Design
    const htmlBody = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', Arial, sans-serif;
              line-height: 1.6; 
              color: #071411; 
              background-color: #F7FAF8;
              padding: 20px;
            }
            .email-wrapper {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(11, 107, 58, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #0B6B3A 0%, #22C55E 100%);
              color: #ffffff;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              font-size: 28px;
              font-weight: 700;
              margin: 0 0 8px 0;
            }
            .header p {
              font-size: 14px;
              opacity: 0.95;
            }
            .content {
              padding: 40px 30px;
              background: #ffffff;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-item {
              background: linear-gradient(to right, #F7FAF8 0%, #ffffff 100%);
              border-left: 4px solid #22C55E;
              padding: 18px 20px;
              border-radius: 8px;
            }
            .info-label {
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #0B6B3A;
              margin-bottom: 6px;
            }
            .info-value {
              font-size: 16px;
              font-weight: 500;
              color: #071411;
            }
            .info-value a {
              color: #0B6B3A;
              text-decoration: none;
            }
            .info-value a:hover {
              color: #22C55E;
              text-decoration: underline;
            }
            .company-badge {
              display: inline-block;
              background: linear-gradient(135deg, #0B6B3A 0%, #22C55E 100%);
              color: #ffffff;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              margin-top: 4px;
            }
            .requirements-section {
              background: linear-gradient(135deg, #F7FAF8 0%, #ffffff 100%);
              border: 2px solid #E5F7ED;
              border-radius: 12px;
              padding: 24px;
              margin-top: 8px;
            }
            .requirements-content {
              font-size: 15px;
              line-height: 1.8;
              color: #071411;
              white-space: pre-wrap;
            }
            .divider {
              height: 1px;
              background: linear-gradient(to right, transparent, #E5F7ED, transparent);
              margin: 30px 0;
            }
            .footer {
              background: #F7FAF8;
              padding: 24px 30px;
              text-align: center;
              border-top: 1px solid #E5F7ED;
            }
            .footer-text {
              font-size: 12px;
              color: #6B7280;
              line-height: 1.6;
            }
            .reply-hint {
              background: linear-gradient(135deg, #E5F7ED 0%, #F0FDF4 100%);
              border-left: 4px solid #22C55E;
              padding: 16px 20px;
              border-radius: 8px;
              margin-top: 20px;
              font-size: 13px;
              color: #0B6B3A;
              text-align: center;
            }
            .reply-hint strong {
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <h1>💼 Business Quote Request</h1>
              <p>Dedicated Link Inquiry</p>
            </div>
            
            <div class="content">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">🏢 Company Name</div>
                  <div class="company-badge">${companyName}</div>
                </div>
                
                <div class="info-item">
                  <div class="info-label">📧 Email Address</div>
                  <div class="info-value">
                    <a href="mailto:${email}">${email}</a>
                  </div>
                </div>
                
                <div class="info-item">
                  <div class="info-label">📱 Phone Number</div>
                  <div class="info-value">
                    <a href="tel:${phone}">${phone}</a>
                  </div>
                </div>
              </div>
              
              <div class="divider"></div>
              
              <div class="info-item">
                <div class="info-label">📋 Requirements</div>
                <div class="requirements-section">
                  <div class="requirements-content">${requirements.replace(/\n/g, '<br>')}</div>
                </div>
              </div>
              
              <div class="reply-hint">
                <strong>💡 Quick Reply:</strong> Reply directly to this email to respond to ${companyName}
              </div>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                This quote request was submitted through the Iconic Fibre business page.
              </p>
              <p class="footer-text">
                Submitted on ${new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    // Plain text version
    const textBody = `
Business Quote Request - Dedicated Link Inquiry

Company Name: ${companyName}
Email: ${email}
Phone: ${phone}

Requirements:
${requirements}

---
This quote request was submitted through the Iconic Fibre business page.
You can reply directly to this email to respond to ${companyName}.
Submitted on ${new Date().toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}
    `

    // Get transporter
    const transporter = getTransporter()

    // Get recipient email from environment variable
    const recipientEmail = process.env.SUPPORT_EMAIL || 'support@3iconic.co.ke'

    console.log(`[Email] Sending business quote request to: ${recipientEmail}`)
    console.log(`[Email] From: ${smtpUser}`)

    // Send email FROM customers@3iconic.co.ke TO support@3iconic.co.ke
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${companyName} (Quote Request)" <${smtpUser}>`,
      to: recipientEmail,
      replyTo: email,
      subject: emailSubject,
      text: textBody,
      html: htmlBody,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Mailer': 'Iconic Fibre Business Portal',
        'MIME-Version': '1.0',
      },
      date: new Date(),
      messageId: `<${Date.now()}-${Math.random().toString(36).substring(7)}@3iconic.co.ke>`,
    }

    const info = await transporter.sendMail(mailOptions)

    console.log(`[Email] ✅ Business quote email sent successfully!`)
    console.log(`[Email] Message ID: ${info.messageId}`)

    return {
      success: true,
      messageId: info.messageId,
      message: `Business quote email sent successfully to ${recipientEmail}`,
      recipient: recipientEmail,
      response: info.response,
    }
  } catch (error) {
    console.error('Error sending business quote email:', error)

    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message

      if (errorMessage.includes('ECONNREFUSED')) {
        errorMessage =
          'Cannot connect to email server. Please check SMTP_HOST and SMTP_PORT settings.'
      } else if (errorMessage.includes('EAUTH')) {
        errorMessage =
          'Email authentication failed. Please check SMTP_USER and SMTP_PASSWORD.'
      } else if (errorMessage.includes('ETIMEDOUT')) {
        errorMessage =
          'Email server connection timed out. Please check your network and SMTP settings.'
      } else if (errorMessage.includes('ENOTFOUND')) {
        errorMessage = 'Email server hostname not found. Please check SMTP_HOST setting.'
      }
    }

    return {
      success: false,
      message: 'Failed to send business quote email',
      error: errorMessage,
    }
  }
}

// Send schedule call email
export async function sendScheduleCallEmail(data: {
  fullName: string
  companyName: string | null
  email: string
  phone: string
  preferredDate: string | null
  preferredTime: string | null
  message: string | null
}) {
  try {
    // Validate email configuration
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASSWORD
    const smtpHost = process.env.SMTP_HOST

    if (!smtpUser || !smtpPass) {
      throw new Error(
        'Email configuration is missing. Please check SMTP_USER and SMTP_PASSWORD environment variables.'
      )
    }

    if (!smtpHost) {
      throw new Error('SMTP host is not configured. Please check SMTP_HOST environment variable.')
    }

    const { fullName, companyName, email, phone, preferredDate, preferredTime, message } = data

    // Format date and time for display
    const formattedDate = preferredDate
      ? new Date(preferredDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Not specified'
    
    const formattedTime = preferredTime
      ? new Date(`2000-01-01T${preferredTime}`).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Not specified'

    // Email subject
    const emailSubject = `Schedule Call Request: ${companyName || fullName}`

    // Email body (HTML) - Modern Premium Design
    const htmlBody = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', 'Roboto', Arial, sans-serif;
              line-height: 1.6; 
              color: #071411; 
              background-color: #F7FAF8;
              padding: 20px;
            }
            .email-wrapper {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(11, 107, 58, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #0B6B3A 0%, #22C55E 100%);
              color: #ffffff;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              font-size: 28px;
              font-weight: 700;
              margin: 0 0 8px 0;
            }
            .header p {
              font-size: 14px;
              opacity: 0.95;
            }
            .content {
              padding: 40px 30px;
              background: #ffffff;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-item {
              background: linear-gradient(to right, #F7FAF8 0%, #ffffff 100%);
              border-left: 4px solid #22C55E;
              padding: 18px 20px;
              border-radius: 8px;
            }
            .info-label {
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #0B6B3A;
              margin-bottom: 6px;
            }
            .info-value {
              font-size: 16px;
              font-weight: 500;
              color: #071411;
            }
            .info-value a {
              color: #0B6B3A;
              text-decoration: none;
            }
            .info-value a:hover {
              color: #22C55E;
              text-decoration: underline;
            }
            .time-badge {
              display: inline-block;
              background: linear-gradient(135deg, #0B6B3A 0%, #22C55E 100%);
              color: #ffffff;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
              margin-top: 4px;
            }
            .message-section {
              background: linear-gradient(135deg, #F7FAF8 0%, #ffffff 100%);
              border: 2px solid #E5F7ED;
              border-radius: 12px;
              padding: 24px;
              margin-top: 8px;
            }
            .message-content {
              font-size: 15px;
              line-height: 1.8;
              color: #071411;
              white-space: pre-wrap;
            }
            .divider {
              height: 1px;
              background: linear-gradient(to right, transparent, #E5F7ED, transparent);
              margin: 30px 0;
            }
            .footer {
              background: #F7FAF8;
              padding: 24px 30px;
              text-align: center;
              border-top: 1px solid #E5F7ED;
            }
            .footer-text {
              font-size: 12px;
              color: #6B7280;
              line-height: 1.6;
            }
            .reply-hint {
              background: linear-gradient(135deg, #E5F7ED 0%, #F0FDF4 100%);
              border-left: 4px solid #22C55E;
              padding: 16px 20px;
              border-radius: 8px;
              margin-top: 20px;
              font-size: 13px;
              color: #0B6B3A;
              text-align: center;
            }
            .reply-hint strong {
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="header">
              <h1>📞 Call Scheduling Request</h1>
              <p>Business Consultation</p>
            </div>
            
            <div class="content">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">👤 Full Name</div>
                  <div class="info-value">${fullName}</div>
                </div>
                
                ${companyName ? `
                <div class="info-item">
                  <div class="info-label">🏢 Company Name</div>
                  <div class="time-badge">${companyName}</div>
                </div>
                ` : ''}
                
                <div class="info-item">
                  <div class="info-label">📧 Email Address</div>
                  <div class="info-value">
                    <a href="mailto:${email}">${email}</a>
                  </div>
                </div>
                
                <div class="info-item">
                  <div class="info-label">📱 Phone Number</div>
                  <div class="info-value">
                    <a href="tel:${phone}">${phone}</a>
                  </div>
                </div>
                
                <div class="info-item">
                  <div class="info-label">📅 Preferred Date</div>
                  <div class="time-badge">${formattedDate}</div>
                </div>
                
                <div class="info-item">
                  <div class="info-label">⏰ Preferred Time</div>
                  <div class="time-badge">${formattedTime}</div>
                </div>
              </div>
              
              ${message ? `
              <div class="divider"></div>
              
              <div class="info-item">
                <div class="info-label">💬 Additional Notes</div>
                <div class="message-section">
                  <div class="message-content">${message.replace(/\n/g, '<br>')}</div>
                </div>
              </div>
              ` : ''}
              
              <div class="reply-hint">
                <strong>💡 Quick Reply:</strong> Reply directly to this email to confirm the call schedule with ${fullName}
              </div>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                This call request was submitted through the Iconic Fibre business page.
              </p>
              <p class="footer-text">
                Submitted on ${new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    // Plain text version
    const textBody = `
Call Scheduling Request - Business Consultation

Full Name: ${fullName}
${companyName ? `Company Name: ${companyName}\n` : ''}Email: ${email}
Phone: ${phone}
Preferred Date: ${formattedDate}
Preferred Time: ${formattedTime}
${message ? `\nAdditional Notes:\n${message}` : ''}

---
This call request was submitted through the Iconic Fibre business page.
You can reply directly to this email to confirm the call schedule with ${fullName}.
Submitted on ${new Date().toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}
    `

    // Get transporter
    const transporter = getTransporter()

    // Get recipient email from environment variable
    const recipientEmail = process.env.SUPPORT_EMAIL || 'support@3iconic.co.ke'

    console.log(`[Email] Sending schedule call request to: ${recipientEmail}`)
    console.log(`[Email] From: ${smtpUser}`)

    // Send email FROM customers@3iconic.co.ke TO support@3iconic.co.ke
    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${fullName} (Call Request)" <${smtpUser}>`,
      to: recipientEmail,
      replyTo: email,
      subject: emailSubject,
      text: textBody,
      html: htmlBody,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Mailer': 'Iconic Fibre Business Portal',
        'MIME-Version': '1.0',
      },
      date: new Date(),
      messageId: `<${Date.now()}-${Math.random().toString(36).substring(7)}@3iconic.co.ke>`,
    }

    const info = await transporter.sendMail(mailOptions)

    console.log(`[Email] ✅ Schedule call email sent successfully!`)
    console.log(`[Email] Message ID: ${info.messageId}`)

    return {
      success: true,
      messageId: info.messageId,
      message: `Schedule call email sent successfully to ${recipientEmail}`,
      recipient: recipientEmail,
      response: info.response,
    }
  } catch (error) {
    console.error('Error sending schedule call email:', error)

    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message

      if (errorMessage.includes('ECONNREFUSED')) {
        errorMessage =
          'Cannot connect to email server. Please check SMTP_HOST and SMTP_PORT settings.'
      } else if (errorMessage.includes('EAUTH')) {
        errorMessage =
          'Email authentication failed. Please check SMTP_USER and SMTP_PASSWORD.'
      } else if (errorMessage.includes('ETIMEDOUT')) {
        errorMessage =
          'Email server connection timed out. Please check your network and SMTP settings.'
      } else if (errorMessage.includes('ENOTFOUND')) {
        errorMessage = 'Email server hostname not found. Please check SMTP_HOST setting.'
      }
    }

    return {
      success: false,
      message: 'Failed to send schedule call email',
      error: errorMessage,
    }
  }
}

