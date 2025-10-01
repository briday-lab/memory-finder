import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

// AWS SES configuration (use default AWS credential provider chain: IAM role, env, config)
// This works on Amplify/EC2/Lambda without hardcoding credentials
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-2',
})

// Email configuration
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}

// Create transporter
const createTransporter = () => {
  if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
    console.warn('SMTP credentials not configured. Email notifications will be disabled.')
    return null
  }

  return nodemailer.createTransport(EMAIL_CONFIG)
}

// Create Resend client
const createResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Resend API key not configured.')
    return null
  }
  return new Resend(process.env.RESEND_API_KEY)
}

export interface ProjectInvitationData {
  videographerName: string
  videographerEmail: string
  projectName: string
  brideName: string
  groomName: string
  weddingDate: string
  invitationMessage?: string
  invitationToken: string
  coupleEmail: string
  coupleName?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send project invitation email to couple
 */
export async function sendProjectInvitationEmail(data: ProjectInvitationData): Promise<EmailResult> {
  const invitationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/invitation/${data.invitationToken}`
  
  // Try AWS SES first (most reliable for production)
  let sesFailureError: unknown = null
  if (sesClient) {
    try {
      const command = new SendEmailCommand({
        Source: 'Memory Finder <info@briday.ca>',
        Destination: {
          ToAddresses: [data.coupleEmail],
        },
        Message: {
          Subject: {
            Data: `🎥 Your Wedding Video is Ready! - ${data.projectName}`,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: generateInvitationEmailHTML(data, invitationUrl),
              Charset: 'UTF-8',
            },
            Text: {
              Data: generateInvitationEmailText(data, invitationUrl),
              Charset: 'UTF-8',
            },
          },
        },
      })

      const result = await sesClient.send(command)
      console.log('Project invitation email sent via AWS SES:', result.MessageId)
      
      return {
        success: true,
        messageId: result.MessageId
      }
    } catch (error) {
      console.error('AWS SES email failed:', error)
      sesFailureError = error
    }
  } else {
    console.log('AWS SES not configured, trying Resend...')
  }
  
  // Try Resend as fallback
  const resendClient = createResendClient()
  if (resendClient) {
    try {
      const result = await resendClient.emails.send({
        from: 'Memory Finder <info@briday.ca>',
        to: [data.coupleEmail],
        subject: `🎥 Your Wedding Video is Ready! - ${data.projectName}`,
        html: generateInvitationEmailHTML(data, invitationUrl),
        text: generateInvitationEmailText(data, invitationUrl)
      })
      
      console.log('Project invitation email sent via Resend:', result.data?.id)
      
      return {
        success: true,
        messageId: result.data?.id
      }
    } catch (error) {
      console.error('Resend email failed, trying SMTP:', error)
    }
  }

  // Fallback to SMTP
  const transporter = createTransporter()
  if (!transporter) {
    // If SES was attempted and failed, surface that error instead of a generic message
    return {
      success: false,
      error: (typeof (sesFailureError as Error)?.message === 'string')
        ? (sesFailureError as Error).message
        : 'Email send failed via SES and no fallback service is configured'
    }
  }

  try {
    const mailOptions = {
      from: `"Memory Finder" <info@briday.ca>`,
      to: data.coupleEmail,
      subject: `🎥 Your Wedding Video is Ready! - ${data.projectName}`,
      html: generateInvitationEmailHTML(data, invitationUrl),
      text: generateInvitationEmailText(data, invitationUrl)
    }

    const result = await transporter.sendMail(mailOptions)
    
    console.log('Project invitation email sent via SMTP:', result.messageId)
    
    return {
      success: true,
      messageId: result.messageId
    }
  } catch (error) {
    console.error('Failed to send project invitation email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Send processing completion notification
 */
export async function sendProcessingCompleteEmail(
  videographerEmail: string,
  videographerName: string,
  projectName: string,
  fileCount: number
): Promise<EmailResult> {
  const transporter = createTransporter()
  
  if (!transporter) {
    return {
      success: false,
      error: 'Email service not configured'
    }
  }

  try {
    const dashboardUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`
    
    const mailOptions = {
      from: `"Memory Finder" <info@briday.ca>`,
      to: videographerEmail,
      subject: `✅ Video Processing Complete - ${projectName}`,
      html: generateProcessingCompleteHTML(videographerName, projectName, fileCount, dashboardUrl),
      text: generateProcessingCompleteText(videographerName, projectName, fileCount, dashboardUrl)
    }

    const result = await transporter.sendMail(mailOptions)
    
    console.log('Processing complete email sent:', result.messageId)
    
    return {
      success: true,
      messageId: result.messageId
    }
  } catch (error) {
    console.error('Failed to send processing complete email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Generate HTML email template for project invitation
 */
function generateInvitationEmailHTML(data: ProjectInvitationData, invitationUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Wedding Video is Ready!</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .project-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .highlight { color: #667eea; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎥 Your Wedding Video is Ready!</h1>
          <p>${data.videographerName} has shared your special day with you</p>
        </div>
        
        <div class="content">
          <h2>Hello ${data.coupleName || 'there'}!</h2>
          
          <p>Great news! Your wedding video project <span class="highlight">"${data.projectName}"</span> is ready for you to explore.</p>
          
          <div class="project-info">
            <h3>📋 Project Details</h3>
            <p><strong>Wedding:</strong> ${data.brideName} + ${data.groomName}</p>
            <p><strong>Date:</strong> ${data.weddingDate}</p>
            <p><strong>Videographer:</strong> ${data.videographerName}</p>
          </div>
          
          ${data.invitationMessage ? `
            <div class="project-info">
              <h3>💌 Personal Message</h3>
              <p>"${data.invitationMessage}"</p>
            </div>
          ` : ''}
          
          <div style="text-align: center;">
            <a href="${invitationUrl}" class="cta-button">🎬 View Your Wedding Video</a>
          </div>
          
          <h3>✨ What You Can Do:</h3>
          <ul>
            <li><strong>Search your memories:</strong> Find specific moments using natural language like "wedding vows" or "first dance"</li>
            <li><strong>Browse by moments:</strong> Explore curated highlights from your special day</li>
            <li><strong>Share favorites:</strong> Create and share your favorite moments with family and friends</li>
            <li><strong>Download clips:</strong> Save your favorite moments to keep forever</li>
          </ul>
          
          <p><strong>Need help?</strong> Reply to this email or contact ${data.videographerName} at ${data.videographerEmail}</p>
        </div>
        
        <div class="footer">
          <p>This invitation was sent by Memory Finder - AI-powered wedding video search</p>
          <p>If you didn't expect this email, you can safely ignore it.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Generate plain text email template for project invitation
 */
function generateInvitationEmailText(data: ProjectInvitationData, invitationUrl: string): string {
  return `
Your Wedding Video is Ready!

Hello ${data.coupleName || 'there'}!

Great news! Your wedding video project "${data.projectName}" is ready for you to explore.

Project Details:
- Wedding: ${data.brideName} + ${data.groomName}
- Date: ${data.weddingDate}
- Videographer: ${data.videographerName}

${data.invitationMessage ? `Personal Message: "${data.invitationMessage}"` : ''}

View Your Wedding Video: ${invitationUrl}

What You Can Do:
- Search your memories: Find specific moments using natural language like "wedding vows" or "first dance"
- Browse by moments: Explore curated highlights from your special day
- Share favorites: Create and share your favorite moments with family and friends
- Download clips: Save your favorite moments to keep forever

Need help? Reply to this email or contact ${data.videographerName} at ${data.videographerEmail}

This invitation was sent by Memory Finder - AI-powered wedding video search
If you didn't expect this email, you can safely ignore it.
  `
}

/**
 * Generate HTML email template for processing completion
 */
function generateProcessingCompleteHTML(
  videographerName: string,
  projectName: string,
  fileCount: number,
  dashboardUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Video Processing Complete</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .cta-button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Video Processing Complete!</h1>
          <p>Your wedding video is ready for AI-powered search</p>
        </div>
        
        <div class="content">
          <h2>Hello ${videographerName}!</h2>
          
          <p>Great news! The AI processing for your project <strong>"${projectName}"</strong> has been completed successfully.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>📊 Processing Summary</h3>
            <p><strong>Files Processed:</strong> ${fileCount}</p>
            <p><strong>Status:</strong> ✅ Complete</p>
            <p><strong>AI Analysis:</strong> Transcription, Vision Labels, Face Detection, Shot Detection</p>
            <p><strong>Search Ready:</strong> Semantic search is now available</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${dashboardUrl}" class="cta-button">🎬 View Project Dashboard</a>
          </div>
          
          <h3>🎯 Next Steps:</h3>
          <ul>
            <li><strong>Share with couple:</strong> Use the "Share Project" button to invite the couple</li>
            <li><strong>Test search:</strong> Try searching for moments like "wedding vows" or "first dance"</li>
            <li><strong>Review results:</strong> Check the AI analysis results and video segments</li>
          </ul>
          
          <p>Your wedding video is now fully searchable and ready to create magical moments for the couple!</p>
        </div>
        
        <div class="footer">
          <p>This notification was sent by Memory Finder - AI-powered wedding video search</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Generate plain text email template for processing completion
 */
function generateProcessingCompleteText(
  videographerName: string,
  projectName: string,
  fileCount: number,
  dashboardUrl: string
): string {
  return `
Video Processing Complete!

Hello ${videographerName}!

Great news! The AI processing for your project "${projectName}" has been completed successfully.

Processing Summary:
- Files Processed: ${fileCount}
- Status: Complete
- AI Analysis: Transcription, Vision Labels, Face Detection, Shot Detection
- Search Ready: Semantic search is now available

View Project Dashboard: ${dashboardUrl}

Next Steps:
- Share with couple: Use the "Share Project" button to invite the couple
- Test search: Try searching for moments like "wedding vows" or "first dance"
- Review results: Check the AI analysis results and video segments

Your wedding video is now fully searchable and ready to create magical moments for the couple!

This notification was sent by Memory Finder - AI-powered wedding video search
  `
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(): Promise<EmailResult> {
  const transporter = createTransporter()
  
  if (!transporter) {
    return {
      success: false,
      error: 'Email service not configured. Please set SMTP_USER and SMTP_PASS environment variables.'
    }
  }

  try {
    await transporter.verify()
    return {
      success: true,
      messageId: 'configuration-verified'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
