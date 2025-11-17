# SMS Integration Setup

## Environment Variables

Add these to your `.env.local` file:

```env
# Zettatel SMS API Credentials
ZETTATEL_USERNAME=IconFibre
ZETTATEL_PASSWORD=r5s8YbWq
ZETTATEL_SENDER_ID=ICONFIBRE

# Phone numbers to receive ticket notifications (comma-separated)
TICKET_NUMBERS=+254796030992,+254746089137

# Optional: Secret for cron job authentication
CRON_SECRET=your-secret-key-here
```

## Features

1. **Automatic SMS on Ticket Creation**
   - When a ticket is created, SMS notifications are automatically sent to all numbers in `TICKET_NUMBERS`
   - SMS includes: Ticket ID, Client Name, Station, Category

2. **24-Hour Reminder System**
   - Automatically sends reminders for tickets that are still open after 24 hours
   - Reminders are sent every 6 hours (configurable)
   - Prevents duplicate reminders (only sends if last reminder was > 24 hours ago)

## Cron Job Setup

### Option 1: Vercel Cron Jobs (Recommended for Vercel deployments)

The `vercel.json` file is already configured. Vercel will automatically run the cron job.

### Option 2: External Cron Service

Use a service like:
- **cron-job.org** - Free cron service
- **EasyCron** - Cron job scheduler
- **GitHub Actions** - If using GitHub

Set up a cron job to call:
```
POST https://your-domain.com/api/tickets/send-reminders
```

Schedule: Every 6 hours (or as needed)
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Daily at midnight
- `0 */24 * * *` - Every 24 hours

### Option 3: Manual Testing

You can manually trigger reminders by visiting:
```
GET https://your-domain.com/api/tickets/send-reminders
```

Or using curl:
```bash
curl -X POST https://your-domain.com/api/tickets/send-reminders
```

## SMS Message Format

### Ticket Creation SMS:
```
New Ticket Created
Ticket ID: TKT-001
Client: John Doe
Station: Station A
Category: Installation

Please check the system for details.
```

### Reminder SMS:
```
Ticket Reminder
Ticket ID: TKT-001
Client: John Doe
Station: Station A
Category: Installation
Status: Still Open
Open for: 25 hours

Please follow up on this ticket.
```

## Troubleshooting

1. **SMS not sending**: Check console logs for errors
2. **Reminders not working**: Ensure cron job is set up correctly
3. **API errors**: Verify Zettatel credentials are correct

