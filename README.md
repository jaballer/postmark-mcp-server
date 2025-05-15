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

## Usage
The server listens for MCP requests and sends emails using Postmark. See the code and comments for details on the available tool and its parameters.

## Sample Prompts

Below are example prompts and payloads you can use with the Postmark MCP server. These demonstrate how to interact with each available tool.

### Send a Single Email
**Prompt:**
```
Call the `sendEmail` tool to send an email to john@example.com with subject "Hello" and body "This is a test email."
```
**Payload:**
```json
{
  "to": "john@example.com",
  "subject": "Hello",
  "textBody": "This is a test email."
}
```

---

### Send a Batch of Emails
**Prompt:**
```
Call the `sendEmailBatch` tool to send two emails: one to alice@example.com and one to bob@example.com.
```
**Payload:**
```json
{
  "messages": [
    {
      "to": "alice@example.com",
      "subject": "Hi Alice",
      "textBody": "Hello Alice!"
    },
    {
      "to": "bob@example.com",
      "subject": "Hi Bob",
      "textBody": "Hello Bob!"
    }
  ]
}
```

---

### Send an Email Using a Template
**Prompt:**
```
Call the `sendEmailWithTemplate` tool to send a templated email to jane@example.com using template ID 12345.
```
**Payload:**
```json
{
  "to": "jane@example.com",
  "templateId": 12345,
  "templateModel": {
    "name": "Jane",
    "orderNumber": "A001"
  }
}
```

---

### Create a New Template
**Prompt:**
```
Call the `createTemplate` tool to create a new template named "Welcome".
```
**Payload:**
```json
{
  "name": "Welcome",
  "subject": "Welcome to our service!",
  "htmlBody": "<h1>Hello {{name}}</h1>",
  "textBody": "Hello {{name}}"
}
```

---

### Update an Existing Template
**Prompt:**
```
Call the `updateTemplate` tool to update template ID 12345 with a new subject.
```
**Payload:**
```json
{
  "templateId": 12345,
  "subject": "Updated Subject"
}
```

---

### List All Templates
**Prompt:**
```
Call the `listTemplates` tool to list all templates.
```
**Payload:**
```json
{}
```

---

### Get a Specific Template
**Prompt:**
```
Call the `getTemplate` tool to get details for template ID 12345.
```
**Payload:**
```json
{
  "templateId": 12345
}
```

---

### Get Delivery Statistics
**Prompt:**
```
Call the `getDeliveryStats` tool to get open and bounce rates for the last 30 days.
```
**Payload:**
```json
{}
```

---

### Get Outbound Messages
**Prompt:**
```
Call the `getOutboundMessages` tool to get the last 5 outbound messages.
```
**Payload:**
```json
{
  "count": 5
}
```

---

### Create a Sending Domain
**Prompt:**
```
Call the `createDomain` tool to create a new sending domain for example.com.
```
**Payload:**
```json
{
  "name": "example.com"
}
```

---

### Verify Domain DKIM
**Prompt:**
```
Call the `verifyDomainDKIM` tool to verify DKIM for domain ID 6789.
```
**Payload:**
```json
{
  "domainId": 6789
}
```

---

### Verify Domain Return Path
**Prompt:**
```
Call the `verifyDomainReturnPath` tool to verify the return path for domain ID 6789.
```
**Payload:**
```json
{
  "domainId": 6789
}
```

## License
MIT 