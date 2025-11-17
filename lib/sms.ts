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
 * Send ticket creation notification to admins/technicians
 */
export async function sendTicketCreationSMS(
  ticketId: string, 
  clientName: string, 
  clientNumber: string,
  station: string,
  houseNumber: string,
  category: string,
  dateTimeReported: Date,
  problemDescription: string,
  baseUrl?: string
): Promise<void> {
  // Get base URL from environment or use default
  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const ticketLink = `${appUrl}/admin/tickets?ticket=${ticketId}`;
  
  // Format date and time
  const reportedDate = new Date(dateTimeReported);
  const formattedDate = reportedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = reportedDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedDateTime = `${formattedDate} ${formattedTime}`;
  
  const message = `New Ticket Created\n\nTicket ID: ${ticketId}\nClient: ${clientName}\nClient Phone: ${clientNumber}\nLocation: ${station}\nHouse/Barrack: ${houseNumber}\nCategory: ${category}\nReported: ${formattedDateTime}\nDescription: ${problemDescription}\n\nView & Update: ${ticketLink}`;
  
  const numbers = TICKET_NUMBERS.split(',').map(num => num.trim());
  
  console.log(`[SMS] Attempting to send ticket creation SMS for ticket ${ticketId}`);
  console.log(`[SMS] Phone numbers:`, numbers);
  console.log(`[SMS] Ticket link:`, ticketLink);
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
  
  // Professional message for the client
  const message = `Hello ${clientName},\n\nThank you for contacting Iconic Fibre. Your support ticket ${ticketId} has been successfully created.\n\nIssue Type: ${category}\nLocation: ${station}\n\nOur technical team is reviewing your request and will take action shortly. You will receive an update once we begin working on your ticket.\n\nIf you have any additional details, please reply to this message or contact us at ${customerCareNumber}.\n\nBest regards,\nIconic Fibre Support Team`;
  
  console.log(`[Client SMS] Attempting to send SMS to client for ticket ${ticketId}`);
  console.log(`[Client SMS] Client number:`, clientNumber);
  console.log(`[Client SMS] Message:`, message);
  
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
 * Send SMS to client when ticket is resolved
 */
export async function sendTicketResolvedSMS(
  ticketId: string,
  clientName: string,
  clientNumber: string
): Promise<void> {
  const message = `Hello,\n\nWe are pleased to inform you that the issue you reported has now been fully resolved.\n\nPlease take a moment to confirm that the service is working smoothly on your side.\n\nThank you for your patience and for choosing our services.\n\nIconic Support Team`;
  
  console.log(`[Client Resolution SMS] Attempting to send resolution SMS to client for ticket ${ticketId}`);
  console.log(`[Client Resolution SMS] Client number:`, clientNumber);
  console.log(`[Client Resolution SMS] Message:`, message);
  
  try {
    const result = await sendSMS({
      mobile: [clientNumber],
      msg: message,
    });
    console.log(`[Client Resolution SMS] ✅ SMS sent successfully to client for ticket ${ticketId}`, result);
  } catch (error) {
    console.error(`[Client Resolution SMS] ❌ Failed to send resolution SMS to client for ticket ${ticketId}:`, error);
    // Don't throw - SMS failure shouldn't prevent ticket resolution
  }
}

/**
 * Send SMS to technician when ticket is assigned
 */
export async function sendTechnicianAssignmentSMS(
  technicianPhone: string,
  ticketId: string,
  issueType: string,
  clientName: string,
  location: string,
  clientPhone: string,
  problemDescription: string,
  baseUrl?: string
): Promise<void> {
  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const ticketLink = `${appUrl}/admin/tickets`;
  
  // Truncate description if too long
  const shortDescription = problemDescription.length > 100 
    ? problemDescription.substring(0, 100) + '...' 
    : problemDescription;
  
  const message = `New Ticket Assigned\n\nA new support ticket has been assigned to you.\n\nIssue: ${issueType}\nClient Name: ${clientName}\nLocation: ${location}\nContact: ${clientPhone}\nTicket ID: ${ticketId}\nDetails: ${shortDescription}\n\nKindly attend to the issue as soon as possible and update the ticket once done.\n\nView Ticket: ${ticketLink}\n\n3 Iconic Concepts Limited – Support Team`;
  
  console.log(`[Technician Assignment SMS] Attempting to send to ${technicianPhone} for ticket ${ticketId}`);
  
  try {
    const result = await sendSMS({
      mobile: [technicianPhone],
      msg: message,
    });
    console.log(`[Technician Assignment SMS] ✅ SMS sent successfully to technician for ticket ${ticketId}`, result);
  } catch (error) {
    console.error(`[Technician Assignment SMS] ❌ Failed to send SMS to technician for ticket ${ticketId}:`, error);
  }
}

/**
 * Send urgent escalation SMS to technician
 */
export async function sendTechnicianEscalationSMS(
  technicianPhone: string,
  ticketId: string,
  issueType: string,
  clientName: string,
  location: string,
  clientPhone: string,
  baseUrl?: string
): Promise<void> {
  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const ticketLink = `${appUrl}/admin/tickets`;
  
  const message = `Urgent Ticket Escalation\n\nPlease prioritize the following issue:\n\nIssue: ${issueType}\nClient: ${clientName}\nLocation: ${location}\nContact: ${clientPhone}\nPriority: HIGH\nTicket ID: ${ticketId}\n\nImmediate action is required.\n\nView Ticket: ${ticketLink}\n\n3 Iconic Concepts Limited – Support Team`;
  
  console.log(`[Technician Escalation SMS] Attempting to send to ${technicianPhone} for ticket ${ticketId}`);
  
  try {
    const result = await sendSMS({
      mobile: [technicianPhone],
      msg: message,
    });
    console.log(`[Technician Escalation SMS] ✅ SMS sent successfully to technician for ticket ${ticketId}`, result);
  } catch (error) {
    console.error(`[Technician Escalation SMS] ❌ Failed to send SMS to technician for ticket ${ticketId}:`, error);
  }
}

/**
 * Send reminder SMS to technician for pending tickets
 */
export async function sendTechnicianReminderSMS(
  technicianPhone: string,
  ticketId: string,
  issueType: string,
  clientName: string,
  baseUrl?: string
): Promise<void> {
  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const ticketLink = `${appUrl}/admin/tickets`;
  
  const message = `Ticket Pending Attention\n\nYou have a pending support ticket:\n\nTicket ID: ${ticketId}\nIssue: ${issueType}\nClient: ${clientName}\n\nKindly update or resolve this ticket as soon as possible.\n\nView Ticket: ${ticketLink}\n\n3 Iconic Concepts Limited – Support Team`;
  
  console.log(`[Technician Reminder SMS] Attempting to send to ${technicianPhone} for ticket ${ticketId}`);
  
  try {
    const result = await sendSMS({
      mobile: [technicianPhone],
      msg: message,
    });
    console.log(`[Technician Reminder SMS] ✅ SMS sent successfully to technician for ticket ${ticketId}`, result);
  } catch (error) {
    console.error(`[Technician Reminder SMS] ❌ Failed to send SMS to technician for ticket ${ticketId}:`, error);
  }
}

/**
 * Send ticket reminder SMS (for tickets open > 24 hours) - to admins/technicians
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

