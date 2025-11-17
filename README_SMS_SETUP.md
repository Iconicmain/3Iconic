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
   - Runs daily at midnight (compatible with Vercel Hobby plan)
   - Prevents duplicate reminders (only sends if last reminder was > 24 hours ago)
   - The endpoint logic ensures reminders are sent exactly every 24 hours, so daily execution is sufficient

## Cron Job Setup

### Option 1: Vercel Cron Jobs (Recommended for Vercel deployments)

The `vercel.json` file is configured to run daily at midnight (`0 0 * * *`), which is compatible with Vercel's Hobby plan. The endpoint logic prevents duplicate reminders, so running once per day is sufficient even though reminders are sent every 24 hours.

**Note:** Vercel Hobby plan only allows daily cron jobs. If you need more frequent checks, use Option 2 (External Cron Service).

### Option 2: External Cron Service

Use a service like:
- **cron-job.org** - Free cron service
- **EasyCron** - Cron job scheduler
- **GitHub Actions** - If using GitHub

Set up a cron job to call:
```
POST https://your-domain.com/api/tickets/send-reminders
```

Schedule options:
- `0 0 * * *` - Daily at midnight (current Vercel config, recommended)
- `0 */6 * * *` - Every 6 hours (requires external service or Vercel Pro)
- `0 */1 * * *` - Every hour (requires external service or Vercel Pro)

**Note:** The endpoint prevents duplicate reminders, so daily execution is sufficient. More frequent checks won't send additional reminders but can provide faster detection of tickets that need reminders.

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

