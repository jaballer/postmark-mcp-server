#!/usr/bin/env node

import 'dotenv/config'; // Loads environment variables from .env if present

/**
 * Postmark MCP Server
 * An MCP server implementation for Postmark email services
 *
 * This server provides a Model Context Protocol interface to Postmark's email API.
 * It allows AI models to send emails, manage templates, check delivery stats,
 * and perform domain management operations through standardized tools.
 *
 * See README.md for environment variable setup instructions.
 *
 * Required environment variables:
 * - POSTMARK_SERVER_TOKEN: Your Postmark API token
 * - DEFAULT_SENDER_EMAIL: Default email address to send from
 * - DEFAULT_MESSAGE_STREAM: Default message stream to use
 * 
 * Author: [Your Name]
 * Version: 1.0.0
 * License: MIT
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod"; // Used for input validation
import postmark from "postmark"; // Postmark SDK
import fetch from "node-fetch"; // For API calls not covered by the SDK

// Postmark configuration
const serverToken = process.env.POSTMARK_SERVER_TOKEN;
const defaultSender = process.env.DEFAULT_SENDER_EMAIL;
const defaultMessageStream = process.env.DEFAULT_MESSAGE_STREAM;

// Validate required environment variables
if (!serverToken) {
  throw new Error('POSTMARK_SERVER_TOKEN is not set. Please configure it in your .env file.');
}
if (!defaultSender) {
  throw new Error('DEFAULT_SENDER_EMAIL is not set. Please configure it in your .env file.');
}
if (!defaultMessageStream) {
  throw new Error('DEFAULT_MESSAGE_STREAM is not set. Please configure it in your .env file.');
}

// Initialize Postmark client
const client = new postmark.ServerClient(serverToken);

// Initialize MCP server
const server = new McpServer({
  name: "postmark-mcp",
  version: "1.0.0"
});

/**
 * Send a single email
 * 
 * Sends an email to a specified recipient with the provided subject and content.
 * Defaults to environment-defined sender and message stream if not specified.
 */
server.tool(
  "sendEmail",
  {
    from: z.string().optional(),
    to: z.string().email(),
    subject: z.string(),
    textBody: z.string(),
    messageStream: z.string().optional()
  },
  async ({ to, subject, textBody, from, messageStream }) => {
    console.error('Received request to send email to:', to);
    const result = await client.sendEmail({
      From: from || defaultSender,
      To: to,
      Subject: subject,
      TextBody: textBody,
      MessageStream: messageStream || defaultMessageStream
    });
    console.error('Email sent successfully:', result.MessageID);
    return {
      content: [
        { type: "text", text: `Email sent! MessageID: ${result.MessageID}` }
      ]
    };
  }
);

/**
 * Send multiple emails in a batch
 * 
 * Efficiently sends multiple emails in a single API call.
 * Each message can have its own recipient, subject, and content.
 */
server.tool(
  "sendEmailBatch",
  {
    messages: z.array(z.object({
      to: z.string().email(),
      subject: z.string(),
      textBody: z.string(),
      from: z.string().optional(),
      messageStream: z.string().optional()
    }))
  },
  async ({ messages }) => {
    const batch = messages.map(msg => ({
      From: msg.from || defaultSender,
      To: msg.to,
      Subject: msg.subject,
      TextBody: msg.textBody,
      MessageStream: msg.messageStream || defaultMessageStream
    }));
    const result = await client.sendEmailBatch(batch);
    return { content: [{ type: "text", text: `Batch sent! Results: ${JSON.stringify(result)}` }] };
  }
);

/**
 * Send an email using a template
 * 
 * Uses a Postmark template with the provided data model.
 * Templates must be created in Postmark or via the createTemplate tool.
 */
server.tool(
  "sendEmailWithTemplate",
  {
    to: z.string().email(),
    templateId: z.number(),
    templateModel: z.object({}).passthrough(),
    from: z.string().optional(),
    messageStream: z.string().optional()
  },
  async ({ to, templateId, templateModel, from, messageStream }) => {
    const result = await client.sendEmailWithTemplate({
      From: from || defaultSender,
      To: to,
      TemplateId: templateId,
      TemplateModel: templateModel,
      MessageStream: messageStream || defaultMessageStream
    });
    return { content: [{ type: "text", text: `Email sent with template! MessageID: ${result.MessageID}` }] };
  }
);

// Template Management Tools

/**
 * Create a new email template
 * 
 * Creates a reusable email template in Postmark with the specified content.
 * Returns the template ID which can be used with sendEmailWithTemplate.
 */
server.tool(
  "createTemplate",
  {
    name: z.string(),
    subject: z.string(),
    htmlBody: z.string(),
    textBody: z.string().optional(),
    alias: z.string().optional()
  },
  async ({ name, subject, htmlBody, textBody, alias }) => {
    const result = await client.createTemplate({
      Name: name,
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody || "",
      Alias: alias
    });
    return { content: [{ type: "text", text: `Template created! ID: ${result.TemplateId}` }] };
  }
);

/**
 * Update an existing email template
 * 
 * Modifies an existing template identified by templateId.
 * Only the provided fields will be updated.
 */
server.tool(
  "updateTemplate",
  {
    templateId: z.number(),
    name: z.string().optional(),
    subject: z.string().optional(),
    htmlBody: z.string().optional(),
    textBody: z.string().optional(),
    alias: z.string().optional()
  },
  async ({ templateId, ...fields }) => {
    const result = await client.editTemplate(templateId, fields);
    return { content: [{ type: "text", text: `Template updated! ID: ${result.TemplateId}` }] };
  }
);

/**
 * List all email templates
 * 
 * Retrieves all templates associated with the Postmark account.
 */
server.tool(
  "listTemplates",
  {},
  async () => {
    const result = await client.getTemplates();
    return { content: [{ type: "text", text: JSON.stringify(result.Templates) }] };
  }
);

/**
 * Get a specific template by ID
 * 
 * Retrieves detailed information about a single template.
 */
server.tool(
  "getTemplate",
  { templateId: z.number() },
  async ({ templateId }) => {
    const result = await client.getTemplate(templateId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// Statistics & Tracking Tools

/**
 * Get email delivery statistics
 * 
 * Retrieves delivery statistics for the last 30 days,
 * including open rates and bounce rates.
 */
server.tool(
  "getDeliveryStats",
  {},
  async () => {
    const response = await fetch("https://api.postmarkapp.com/deliverystats", {
      method: "GET",
      headers: {
        "X-Postmark-Server-Token": serverToken,
        "Accept": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch delivery stats: ${response.status} ${response.statusText}`);
    }
    const stats = await response.json();
    // Extract open and bounce rates for the last 30 days
    const sent = stats.InactiveMails + stats.BouncedMails + stats.DeliveredMails;
    const openRate = stats.Opens && sent ? (stats.Opens / sent) * 100 : null;
    const bounceRate = stats.BouncedMails && sent ? (stats.BouncedMails / sent) * 100 : null;
    return {
      content: [
        { type: "text", text: `Open Rate (last 30 days): ${openRate ? openRate.toFixed(2) : 'N/A'}%` },
        { type: "text", text: `Bounce Rate (last 30 days): ${bounceRate ? bounceRate.toFixed(2) : 'N/A'}%` },
        { type: "text", text: `Raw stats: ${JSON.stringify(stats)}` }
      ]
    };
  }
);

/**
 * Get sent message history
 * 
 * Retrieves a list of recently sent outbound messages with pagination.
 */
server.tool(
  "getOutboundMessages",
  {
    count: z.number().optional(),
    offset: z.number().optional()
  },
  async ({ count = 10, offset = 0 }) => {
    const result = await client.getOutboundMessages({ count, offset });
    return { content: [{ type: "text", text: JSON.stringify(result.Messages) }] };
  }
);

// Domain Management Tools

/**
 * Create a new sending domain
 * 
 * Registers a new domain with Postmark for sending emails.
 * Domain verification will be required after creation.
 */
server.tool(
  "createDomain",
  {
    name: z.string(),
    returnPathDomain: z.string().optional()
  },
  async ({ name, returnPathDomain }) => {
    const result = await client.createDomain({ Name: name, ReturnPathDomain: returnPathDomain });
    return { content: [{ type: "text", text: `Domain created! ID: ${result.ID}` }] };
  }
);

/**
 * Verify domain DKIM setup
 * 
 * Checks if DKIM records have been properly configured for a domain.
 */
server.tool(
  "verifyDomainDKIM",
  { domainId: z.number() },
  async ({ domainId }) => {
    const result = await client.verifyDomainDKIM(domainId);
    return { content: [{ type: "text", text: `DKIM verification: ${JSON.stringify(result)}` }] };
  }
);

/**
 * Verify domain return path setup
 * 
 * Checks if return path records have been properly configured for a domain.
 */
server.tool(
  "verifyDomainReturnPath",
  { domainId: z.number() },
  async ({ domainId }) => {
    const result = await client.verifyDomainReturnPath(domainId);
    return { content: [{ type: "text", text: `Return path verification: ${JSON.stringify(result)}` }] };
  }
);

// Initialize and start the server
console.error('Starting MCP server...');
const transport = new StdioServerTransport();
console.error('About to connect server...');
server.connect(transport)
  .then(() => {
    console.error('Server connected successfully and is now listening for MCP requests.');
  })
  .catch(error => {
    console.error('Error connecting server:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  });