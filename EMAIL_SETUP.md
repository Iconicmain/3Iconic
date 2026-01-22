# Email Setup for Job Applications

## Overview
Job applications submitted through the careers page are automatically sent via email to `careers@3iconic.co.ke` using cPanel email SMTP.

## Configuration

### Environment Variables
The following environment variables are required in `.env.local`:

```env
# Email Configuration (cPanel)
SMTP_HOST=mail.3iconic.co.ke
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=customers@3iconic.co.ke
SMTP_PASSWORD=@Iconic@hr.co.ke
CAREERS_EMAIL=careers@3iconic.co.ke
```

**Note**: If `mail.3iconic.co.ke` doesn't work, try using `3iconic.co.ke` as the SMTP_HOST.

### Email Flow
1. **Sending Email**: `customers@3iconic.co.ke` (configured in `SMTP_USER`)
2. **Receiving Email**: `careers@3iconic.co.ke` (configured in `CAREERS_EMAIL`)

## How It Works

### Application Submission
1. User fills out the 3-step application form:
   - **Step 1**: Basic Information (Name, Phone, Email, County/Town)
   - **Step 2**: Experience (Years of experience)
   - **Step 3**: Attachments (CV/Resume, Optional Certificates)

2. On submission, the form data and files are sent to `/api/jobs/apply`

3. The API endpoint:
   - Validates all required fields
   - Processes file uploads (CV and certificates)
   - Sends a formatted email to `careers@3iconic.co.ke` with:
     - All application details
     - Attached CV/Resume (PDF)
     - Attached Certificates (if provided)
   - Sets reply-to address to the applicant's email for easy response

### Email Format
The email includes:
- **Subject**: "New Job Application: [Job Title] - [Applicant Name]"
- **HTML Body**: Professionally formatted with all application details
- **Attachments**: CV/Resume and Certificates (if provided)
- **Reply-To**: Applicant's email address for easy response

## cPanel Email SMTP Setup

This setup uses cPanel email accounts. The configuration follows cPanel's standard SMTP settings:

### Secure SSL/TLS Settings (Recommended)

**For TLS (Port 587)** - Recommended:
```env
SMTP_HOST=mail.3iconic.co.ke
SMTP_PORT=587
SMTP_SECURE=false
```

**For SSL (Port 465)** - Alternative:
```env
SMTP_HOST=mail.3iconic.co.ke
SMTP_PORT=465
SMTP_SECURE=true
```

### Finding Your SMTP Settings in cPanel

1. Log in to your cPanel account
2. Navigate to **Email Accounts** (cPanel » Home » Email » Email Accounts)
3. Click **Connect Devices** next to the `customers@3iconic.co.ke` account
4. Review the **Mail Client Manual Settings** section for:
   - **SMTP Host**: Usually `mail.3iconic.co.ke` or `3iconic.co.ke`
   - **SMTP Port**: 587 (TLS) or 465 (SSL)
   - **Username**: Full email address (`customers@3iconic.co.ke`)
   - **Password**: The email account password

### Important Notes

- **Username**: Use the full email address (`customers@3iconic.co.ke`), not just the username
- **Password**: Use the actual email account password (not a cPanel password)
- **TLS vs SSL**: Port 587 with TLS is recommended for better compatibility
- **Host**: If `mail.3iconic.co.ke` doesn't work, try `3iconic.co.ke` or check your cPanel email settings

## Testing

To test the email functionality:

1. Ensure all environment variables are set in `.env.local`
2. Restart your development server
3. Submit a test application through the careers page
4. Check `careers@3iconic.co.ke` inbox for the application email

## Troubleshooting

### Email Not Sending
- Verify all environment variables are set correctly in `.env.local`
- Check that `SMTP_HOST` is correct (try `mail.3iconic.co.ke` or `3iconic.co.ke`)
- Verify the email account password is correct
- Ensure the sending email account exists in cPanel
- Check that SMTP is enabled for your cPanel account
- Check server logs for detailed error messages

### Authentication Errors
- Verify the username is the full email address (`customers@3iconic.co.ke`)
- Check that the password is correct (the email account password, not cPanel password)
- Ensure the email account is active in cPanel
- Try switching between TLS (587) and SSL (465) ports
- Verify SMTP access is enabled in cPanel email settings

### File Upload Issues
- Ensure file sizes are within limits (currently 5MB)
- Verify file types are correct (PDF for CV, PDF/JPG/PNG for certificates)
- Check server logs for upload errors

## Security Notes

- Never commit `.env.local` to version control
- Use app passwords instead of regular passwords for Gmail
- The email includes applicant's contact info - ensure `careers@3iconic.co.ke` is properly secured
- Reply-to is set to applicant's email for easy communication

