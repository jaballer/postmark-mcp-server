# Postmark MCP Server

An MCP server implementation for Postmark email services.

## Features
- Exposes a Model Context Protocol (MCP) server for sending emails via Postmark
- Simple configuration via environment variables

## Requirements
- Node.js (v16 or higher recommended)
- A Postmark account and server token

## Setup

1. **Clone the repository:**
   ```sh
   git clone https://github.com/jaballer/postmark-mcp-server.git
   cd postmark-mcp-server
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure environment variables:**
   - Copy `.env.example` to `.env`:
     ```sh
     cp .env.example .env
     ```
   - Edit `.env` and fill in your Postmark credentials and settings.

   | Variable                | Description                        |
   |------------------------|------------------------------------|
   | POSTMARK_SERVER_TOKEN  | Your Postmark server API token      |
   | DEFAULT_SENDER_EMAIL   | Default sender email address        |
   | DEFAULT_MESSAGE_STREAM | Postmark message stream (outbound)  |

4. **Run the server:**
   ```sh
   node postmark-mcp-server.js
   ```

## Tool Reference

This section provides a complete reference for the Postmark MCP server tools, including example prompts and expected payloads for each.

### Table of Contents

- [Email Management Tools](#email-management-tools)
  - [sendEmail](#1-sendemail)
  - [sendEmailBatch](#2-sendemailbatch)
  - [sendEmailWithTemplate](#3-sendemailwithtemplate)
- [Template Management Tools](#template-management-tools)
  - [createTemplate](#4-createtemplate)
  - [updateTemplate](#5-updatetemplate)
  - [listTemplates](#6-listtemplates)
  - [getTemplate](#7-gettemplate)
- [Statistics & Tracking Tools](#statistics--tracking-tools)
  - [getDeliveryStats](#8-getdeliverystats)
  - [getOutboundMessages](#9-getoutboundmessages)
- [Domain Management Tools](#domain-management-tools)
  - [createDomain](#10-createdomain)
  - [verifyDomainDKIM](#11-verifydomaindkim)
  - [verifyDomainReturnPath](#12-verifydomainreturnpath)
- [Combined Operation Examples](#combined-operation-examples)

## Email Management Tools

### 1. sendEmail

Sends a single text email.

**Example Prompt:**
```
Send an email using Postmark to recipient@example.com with the subject "Meeting Reminder" and the message "Don't forget our team meeting tomorrow at 2 PM. Please bring your quarterly reports."
```

**Expected Payload:**
```json
{
  "to": "recipient@example.com",
  "subject": "Meeting Reminder",
  "textBody": "Don't forget our team meeting tomorrow at 2 PM. Please bring your quarterly reports.",
  "from": "info@jabaltorres.com", // Optional, uses DEFAULT_SENDER_EMAIL if not provided
  "messageStream": "outbound" // Optional, uses DEFAULT_MESSAGE_STREAM if not provided
}
```

### 2. sendEmailBatch

Sends multiple emails in a single batch.

**Example Prompt:**
```
Send a batch of emails using Postmark:
1. To: team1@example.com, Subject: "Project Update", Message: "Phase 1 is complete."
2. To: team2@example.com, Subject: "Deployment Notice", Message: "Server will be down for maintenance tonight."
3. To: client@example.com, Subject: "Weekly Report", Message: "Please find attached our weekly progress report."
```

**Expected Payload:**
```json
{
  "messages": [
    {
      "to": "team1@example.com",
      "subject": "Project Update",
      "textBody": "Phase 1 is complete."
    },
    {
      "to": "team2@example.com",
      "subject": "Deployment Notice",
      "textBody": "Server will be down for maintenance tonight."
    },
    {
      "to": "client@example.com",
      "subject": "Weekly Report",
      "textBody": "Please find attached our weekly progress report."
    }
  ]
}
```

### 3. sendEmailWithTemplate

Sends an email using a pre-defined template.

**Example Prompt:**
```
Send an email with Postmark template ID 12345 to customer@example.com. Use the following template variables:
- firstName: "John"
- orderNumber: "ORD-12345"
- totalAmount: "$129.99"
- deliveryDate: "May 20, 2025"
```

**Expected Payload:**
```json
{
  "to": "customer@example.com",
  "templateId": 12345,
  "templateModel": {
    "firstName": "John",
    "orderNumber": "ORD-12345",
    "totalAmount": "$129.99",
    "deliveryDate": "May 20, 2025"
  },
  "from": "info@jabaltorres.com", // Optional
  "messageStream": "outbound" // Optional
}
```

## Template Management Tools

### 4. createTemplate

Creates a new email template.

**Example Prompt:**
```
Create a new Postmark email template with the following details:
- Name: "Order Confirmation"
- Subject: "Your order #{{orderNumber}} has been confirmed"
- HTML Body: "<h1>Thank you for your order!</h1><p>Dear {{customerName}},</p><p>We're pleased to confirm your order #{{orderNumber}} has been received and is being processed.</p><p>Total: {{orderTotal}}</p>"
- Alias: "order-confirmation-v1"
```

**Expected Payload:**
```json
{
  "name": "Order Confirmation",
  "subject": "Your order #{{orderNumber}} has been confirmed",
  "htmlBody": "<h1>Thank you for your order!</h1><p>Dear {{customerName}},</p><p>We're pleased to confirm your order #{{orderNumber}} has been received and is being processed.</p><p>Total: {{orderTotal}}</p>",
  "textBody": "", // Optional
  "alias": "order-confirmation-v1" // Optional
}
```

### 5. updateTemplate

Updates an existing template.

**Example Prompt:**
```
Update Postmark template with ID 12345 to change the subject to "Updated: Your {{company}} account information" and modify the HTML body to include our new company logo and updated footer.
```

**Expected Payload:**
```json
{
  "templateId": 12345,
  "subject": "Updated: Your {{company}} account information",
  "htmlBody": "<h1>Account Information</h1><img src='logo.png'/><p>Your {{company}} account details:</p><p>{{accountDetails}}</p><footer>Updated Company Footer 2025</footer>",
  "name": "Account Information Template", // Optional
  "textBody": "Your {{company}} account details: {{accountDetails}}", // Optional
  "alias": "account-info-v2" // Optional
}
```

### 6. listTemplates

Lists all available templates.

**Example Prompt:**
```
Show me a list of all the email templates available in our Postmark account.
```

**Expected Payload:**
```json
{} // No parameters required
```

### 7. getTemplate

Gets details of a specific template.

**Example Prompt:**
```
Retrieve the full details of the Postmark template with ID 39631860. I want to see its name, subject, and content.
```

**Expected Payload:**
```json
{
  "templateId": 12345
}
```

## Statistics & Tracking Tools

### 8. getDeliveryStats

Retrieves email delivery statistics.

**Example Prompt:**
```
Show me our Postmark email delivery statistics from 2025-05-01 to 2025-05-15.
```

**Expected Payload:**
```json
{} // No parameters required
```

### 9. getOutboundMessages

Gets a list of sent messages.

**Example Prompt:**
```
Show me the last 15 emails we sent through Postmark. I want to see who they were sent to and when.
```

**Expected Payload:**
```json
{
  "count": 15, // Optional, defaults to 10
  "offset": 0 // Optional, defaults to 0
}
```

## Domain Management Tools

### 10. createDomain

Adds a new sender domain.

**Example Prompt:**
```
Create a new sender domain in Postmark with the name "marketing.ourcompany.com". We'll handle the DNS setup once it's created.
```

**Expected Payload:**
```json
{
  "name": "marketing.ourcompany.com",
  "returnPathDomain": "bounce.ourcompany.com" // Optional
}
```

### 11. verifyDomainDKIM

Verifies DKIM for a domain.

**Example Prompt:**
```
Our IT team has added the DKIM records for domain ID 9876 in our DNS. Please verify the DKIM setup in Postmark now.
```

**Expected Payload:**
```json
{
  "domainId": 9876
}
```

### 12. verifyDomainReturnPath

Verifies return path for a domain.

**Example Prompt:**
```
We've added the return path CNAME record for domain ID 9876 as specified in Postmark. Please verify the return path configuration.
```

**Expected Payload:**
```json
{
  "domainId": 9876
}
```

## Combined Operation Examples

### Complete Email Campaign Setup:

**Example Prompt:**
```
Help me set up an email marketing campaign using Postmark:
1. First, create a template named "May Newsletter" with the subject "{{company}} Newsletter - May 2025"
2. Then, check our domain's delivery statistics to ensure good deliverability
3. Finally, send a test email using the new template to test@example.com with the company name set to "Acme Corp"
```

**Expected Payloads (Sequential):**

1. createTemplate:
```json
{
  "name": "May Newsletter",
  "subject": "{{company}} Newsletter - May 2025",
  "htmlBody": "<h1>{{company}} Newsletter</h1><p>Welcome to our May edition...</p>"
}
```

2. getDeliveryStats:
```json
{}
```

3. sendEmailWithTemplate (assuming the template ID returned was 12345):
```json
{
  "to": "test@example.com",
  "templateId": 12345,
  "templateModel": {
    "company": "Acme Corp"
  }
}
```

### Performance Analysis:

**Example Prompt:**
```
Analyze our recent email performance in Postmark:
1. Get our current delivery statistics to see open and bounce rates
2. Show me the last 10 emails we've sent to check for any issues
```

**Expected Payloads (Sequential):**

1. getDeliveryStats:
```json
{}
```

2. getOutboundMessages:
```json
{
  "count": 10,
  "offset": 0
}
```

---

*This document serves as a reference for the Postmark MCP server tools. For more information about Postmark API, visit [Postmark's Developer Documentation](https://postmarkapp.com/developer).* 