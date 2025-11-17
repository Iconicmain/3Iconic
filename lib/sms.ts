/**
 * SMS Service using Zettatel API
 */

interface SMSResponse {
  status: string;
  mobile: string;
  invalidMobile: string;
  transactionId: string;
  statusCode: string;
  reason: string;
}

interface SendSMSOptions {
  mobile: string | string[];
  msg: string;
  senderid?: string;
}

const ZETTATEL_API_URL = 'https://portal.zettatel.com/SMSApi/send';
const ZETTATEL_USERNAME = process.env.ZETTATEL_USERNAME || 'IconFibre';
const ZETTATEL_PASSWORD = process.env.ZETTATEL_PASSWORD || 'r5s8YbWq';
const ZETTATEL_SENDER_ID = process.env.ZETTATEL_SENDER_ID || 'ICONFIBRE';
const TICKET_NUMBERS = process.env.TICKET_NUMBERS || '+254796030992,+254746089137';

/**
 * Send SMS using Zettatel API
 */
export async function sendSMS(options: SendSMSOptions): Promise<SMSResponse[]> {
  const { mobile, msg, senderid = ZETTATEL_SENDER_ID } = options;
  
  // Convert mobile to array if it's a string
  const mobileNumbers = Array.isArray(mobile) ? mobile : [mobile];
  
  // Format phone numbers: remove + and spaces, keep country code
  const formattedNumbers = mobileNumbers.map(num => {
    // Remove + and spaces
    let formatted = num.trim().replace(/\+/g, '').replace(/\s/g, '');
    return formatted;
  });
  
  // Join multiple numbers with comma
  const mobileParam = formattedNumbers.join(',');
  
  console.log('Sending SMS to:', mobileParam);
  console.log('Message:', msg);
  console.log('Sender ID:', senderid);
  
  // Prepare form data
  const formData = new URLSearchParams({
    userid: ZETTATEL_USERNAME,
    password: ZETTATEL_PASSWORD,
    sendMethod: 'quick',
    mobile: mobileParam,
    msg: msg,
    senderid: senderid,
    msgType: 'text',
    duplicatecheck: 'true',
    output: 'json',
  });

  try {
    console.log('Calling Zettatel API:', ZETTATEL_API_URL);
    const response = await fetch(ZETTATEL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'cache-control': 'no-cache',
      },
      body: formData.toString(),
    });

    const responseText = await response.text();
    console.log('Zettatel API Response Status:', response.status);
    console.log('Zettatel API Response:', responseText);

    if (!response.ok) {
      throw new Error(`SMS API returned status ${response.status}: ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      throw new Error(`Invalid JSON response: ${responseText}`);
    }
    
    // Handle both single and batch responses
    if (Array.isArray(data)) {
      console.log('SMS sent successfully to multiple numbers');
      return data;
    } else {
      console.log('SMS sent successfully:', data);
      return [data];
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw error;
  }
}

/**
 * Send ticket creation notification
 */
export async function sendTicketCreationSMS(ticketId: string, clientName: string, station: string, category: string): Promise<void> {
  const message = `New Ticket Created\nTicket ID: ${ticketId}\nClient: ${clientName}\nStation: ${station}\nCategory: ${category}\n\nPlease check the system for details.`;
  
  const numbers = TICKET_NUMBERS.split(',').map(num => num.trim());
  
  console.log(`[SMS] Attempting to send ticket creation SMS for ticket ${ticketId}`);
  console.log(`[SMS] Phone numbers:`, numbers);
  console.log(`[SMS] Zettatel Username:`, ZETTATEL_USERNAME);
  console.log(`[SMS] Zettatel Sender ID:`, ZETTATEL_SENDER_ID);
  
  try {
    const result = await sendSMS({
      mobile: numbers,
      msg: message,
    });
    console.log(`[SMS] ✅ SMS notification sent successfully for ticket ${ticketId}`, result);
  } catch (error) {
    console.error(`[SMS] ❌ Failed to send SMS for ticket ${ticketId}:`, error);
    // Don't throw - SMS failure shouldn't prevent ticket creation
  }
}

/**
 * Send SMS to client when ticket is created
 */
export async function sendClientTicketSMS(
  ticketId: string, 
  clientName: string, 
  clientNumber: string,
  station: string, 
  category: string
): Promise<void> {
  const customerCareNumber = '+254746089137';
  
  // Short, professional message for the client
  const message = `Dear ${clientName},\n\nYour ticket ${ticketId} has been received.\nStation: ${station}\nCategory: ${category}\n\nWe will contact you shortly.\nFor inquiries: ${customerCareNumber}\n\nThank you!`;
  
  console.log(`[Client SMS] Attempting to send SMS to client for ticket ${ticketId}`);
  console.log(`[Client SMS] Client number:`, clientNumber);
  
  try {
    const result = await sendSMS({
      mobile: [clientNumber],
      msg: message,
    });
    console.log(`[Client SMS] ✅ SMS sent successfully to client for ticket ${ticketId}`, result);
  } catch (error) {
    console.error(`[Client SMS] ❌ Failed to send SMS to client for ticket ${ticketId}:`, error);
    // Don't throw - SMS failure shouldn't prevent ticket creation
  }
}

/**
 * Send ticket reminder SMS (for tickets open > 24 hours)
 */
export async function sendTicketReminderSMS(ticketId: string, clientName: string, station: string, category: string, hoursOpen: number): Promise<void> {
  const message = `Ticket Reminder\nTicket ID: ${ticketId}\nClient: ${clientName}\nStation: ${station}\nCategory: ${category}\nStatus: Still Open\nOpen for: ${Math.round(hoursOpen)} hours\n\nPlease follow up on this ticket.`;
  
  const numbers = TICKET_NUMBERS.split(',').map(num => num.trim());
  
  try {
    await sendSMS({
      mobile: numbers,
      msg: message,
    });
    console.log(`Reminder SMS sent for ticket ${ticketId}`);
  } catch (error) {
    console.error(`Failed to send reminder SMS for ticket ${ticketId}:`, error);
  }
}

