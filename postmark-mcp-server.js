#!/usr/bin/env node

import 'dotenv/config'; // Loads environment variables from .env if present

/**
 * @file Postmark MCP Server
 * @description A Cursor MCP server implementation for Postmark's email API.
 * Provides a CursorModel Context Protocol interface to Postmark, enabling AI models to send emails, manage templates, check delivery stats, and perform domain management.
 *
 * @author Jabal Torres
 * @version 1.0.0
 * @license MIT
 *
 * @requires POSTMARK_SERVER_TOKEN - Your Postmark API token
 * @requires DEFAULT_SENDER_EMAIL - Default email address to send from
 * @requires DEFAULT_MESSAGE_STREAM - Default message stream to use
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

// =====================
// Email Sending Tools
// =====================

/**
 * Send a single email.
 *
 * @param {Object} params - The email parameters.
 * @param {string} [params.from] - The sender's email address. Defaults to environment variable.
 * @param {string} params.to - The recipient's email address.
 * @param {string} params.subject - The subject of the email.
 * @param {string} params.textBody - The plain text body of the email.
 * @param {string} [params.messageStream] - The message stream to use. Defaults to environment variable.
 * @param {string} [params.tag] - An optional tag for categorizing the email.
 * @param {boolean} params.trackOpens - Whether to track opens (always true).
 * @param {string} params.trackLinks - Link tracking mode (always 'HtmlAndText').
 * @returns {Promise<Object>} Result object containing the Postmark MessageID.
 * @throws {Error} If sending fails or required parameters are missing.
 */
server.tool(
  "sendEmail",
  {
    from: z.string().optional(),
    to: z.string().email(),
    subject: z.string(),
    textBody: z.string(),
    messageStream: z.string().optional(),
    tag: z.string().optional(),
    trackOpens: z.literal(true), // Always true
    trackLinks: z.literal("HtmlAndText") // Always 'HtmlAndText'
  },
  async ({ to, subject, textBody, from, messageStream, tag }) => {
    console.error('Received request to send email to:', to);
    // Build payload and only include Tag if defined and non-empty
    const payload = {
      From: from || defaultSender,
      To: to,
      Subject: subject,
      TextBody: textBody,
      MessageStream: messageStream || defaultMessageStream,
      TrackOpens: true,
      TrackLinks: "HtmlAndText"
    };
    if (tag && tag.trim() !== "") {
      payload.Tag = tag;
    }
    console.error('Payload being sent to Postmark:', JSON.stringify(payload));
    const result = await client.sendEmail(payload);
    console.error('Email sent successfully:', result.MessageID);
    return {
      content: [
        { type: "text", text: `Email sent! MessageID: ${result.MessageID}` }
      ]
    };
  }
);

/**
 * Send multiple emails in a batch.
 *
 * @param {Object} params - The batch parameters.
 * @param {Array<Object>} params.messages - Array of message objects.
 * @param {string} params.messages[].to - Recipient email address.
 * @param {string} params.messages[].subject - Email subject.
 * @param {string} params.messages[].textBody - Email body (plain text).
 * @param {string} [params.messages[].from] - Sender email address. Defaults to environment variable.
 * @param {string} [params.messages[].messageStream] - Message stream. Defaults to environment variable.
 * @param {boolean} params.messages[].trackOpens - Whether to track opens (always true).
 * @param {string} params.messages[].trackLinks - Link tracking mode (always 'HtmlAndText').
 * @returns {Promise<Object>} Batch result from Postmark.
 * @throws {Error} If sending fails or required parameters are missing.
 */
server.tool(
  "sendEmailBatch",
  {
    messages: z.array(z.object({
      to: z.string().email(),
      subject: z.string(),
      textBody: z.string(),
      from: z.string().optional(),
      messageStream: z.string().optional(),
      trackOpens: z.literal(true),
      trackLinks: z.literal("HtmlAndText")
    }))
  },
  async ({ messages }) => {
    const batch = messages.map(msg => ({
      From: msg.from || defaultSender,
      To: msg.to,
      Subject: msg.subject,
      TextBody: msg.textBody,
      MessageStream: msg.messageStream || defaultMessageStream,
      TrackOpens: true,
      TrackLinks: "HtmlAndText"
    }));
    const result = await client.sendEmailBatch(batch);
    return { content: [{ type: "text", text: `Batch sent! Results: ${JSON.stringify(result)}` }] };
  }
);

/**
 * Send an email using a template.
 *
 * @param {Object} params - The template email parameters.
 * @param {string} params.to - Recipient email address.
 * @param {number} [params.templateId] - Template ID to use.
 * @param {string} [params.templateAlias] - Template alias to use.
 * @param {Object} params.templateModel - Data model for the template.
 * @param {string} [params.from] - Sender email address. Defaults to environment variable.
 * @param {string} [params.messageStream] - Message stream. Defaults to environment variable.
 * @param {string} [params.tag] - Optional tag for categorization.
 * @param {boolean} params.trackOpens - Whether to track opens (always true).
 * @param {string} params.trackLinks - Link tracking mode (always 'HtmlAndText').
 * @returns {Promise<Object>} Result object containing the Postmark MessageID.
 * @throws {Error} If neither templateId nor templateAlias is provided, or if sending fails.
 */
server.tool(
  "sendEmailWithTemplate",
  {
    to: z.string().email(),
    templateId: z.number().optional(),
    templateAlias: z.string().optional(),
    templateModel: z.object({}).passthrough(),
    from: z.string().optional(),
    messageStream: z.string().optional(),
    tag: z.string().optional(),
    trackOpens: z.literal(true),
    trackLinks: z.literal("HtmlAndText")
  },
  async ({ to, templateId, templateAlias, templateModel, from, messageStream, tag }) => {
    const payload = {
      From: from || defaultSender,
      To: to,
      TemplateModel: templateModel,
      MessageStream: messageStream || defaultMessageStream,
      TrackOpens: true,
      TrackLinks: "HtmlAndText"
    };
    if (templateId) {
      payload.TemplateId = templateId;
    } else if (templateAlias) {
      payload.TemplateAlias = templateAlias;
    } else {
      throw new Error('Either templateId or templateAlias must be provided.');
    }
    if (tag && tag.trim() !== "") {
      payload.Tag = tag;
    }
    const result = await client.sendEmailWithTemplate(payload);
    return { content: [{ type: "text", text: `Email sent with template! MessageID: ${result.MessageID}` }] };
  }
);

// =====================
// Template Management Tools
// =====================

/**
 * Create a new email template.
 *
 * @param {Object} params - Template creation parameters.
 * @param {string} params.name - Template name.
 * @param {string} params.subject - Template subject.
 * @param {string} params.htmlBody - HTML body of the template.
 * @param {string} [params.textBody] - Plain text body of the template.
 * @param {string} [params.alias] - Optional template alias.
 * @returns {Promise<Object>} Result object containing the new template ID.
 * @throws {Error} If creation fails or required parameters are missing.
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
 * Update an existing email template.
 *
 * @param {Object} params - Template update parameters.
 * @param {number} params.templateId - ID of the template to update.
 * @param {string} [params.name] - New template name.
 * @param {string} [params.subject] - New subject.
 * @param {string} [params.htmlBody] - New HTML body.
 * @param {string} [params.textBody] - New plain text body.
 * @param {string} [params.alias] - New alias.
 * @returns {Promise<Object>} Result object containing the updated template ID.
 * @throws {Error} If update fails or required parameters are missing.
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
 * List all email templates.
 *
 * @returns {Promise<Object>} List of all templates associated with the Postmark account.
 * @throws {Error} If retrieval fails.
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
 * Get a specific template by ID.
 *
 * @param {Object} params
 * @param {number} params.templateId - ID of the template to retrieve.
 * @returns {Promise<Object>} Detailed information about the template.
 * @throws {Error} If retrieval fails or template does not exist.
 */
server.tool(
  "getTemplate",
  { templateId: z.number() },
  async ({ templateId }) => {
    const result = await client.getTemplate(templateId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// =====================
// Statistics & Tracking Tools
// =====================

/**
 * Get email delivery statistics.
 *
 * @param {Object} params - Statistics query parameters.
 * @param {string} [params.tag] - Filter by tag.
 * @param {string} [params.fromDate] - Start date (YYYY-MM-DD).
 * @param {string} [params.toDate] - End date (YYYY-MM-DD).
 * @param {string} [params.messageStream] - Filter by message stream.
 * @returns {Promise<Object>} Delivery statistics summary.
 * @throws {Error} If retrieval fails or API call errors.
 */
server.tool(
  "getDeliveryStats",
  {
    tag: z.string().optional(),
    fromDate: z.string().optional(), // YYYY-MM-DD
    toDate: z.string().optional(),   // YYYY-MM-DD
    messageStream: z.string().optional()
  },
  async (params) => {
    // Build query string from params
    const query = [];
    if (params.fromDate) query.push(`fromdate=${encodeURIComponent(params.fromDate)}`);
    if (params.toDate) query.push(`todate=${encodeURIComponent(params.toDate)}`);
    if (params.tag) query.push(`tag=${encodeURIComponent(params.tag)}`);
    if (params.messageStream) query.push(`messagestream=${encodeURIComponent(params.messageStream)}`);
    
    const url = `https://api.postmarkapp.com/stats/outbound${query.length ? '?' + query.join('&') : ''}`;

    const headers = {
      "Accept": "application/json",
      "X-Postmark-Server-Token": serverToken
    };
    
    try {
      const response = await fetch(url, { method: "GET", headers });
      const data = await response.json();

      // Calculate summary stats
      const sent = data.Sent || 0;
      const tracked = data.Tracked || 0; // emails with open tracking
      const uniqueOpens = data.UniqueOpens || 0;
      const totalTrackedLinks = data.TotalTrackedLinksSent || 0;
      const uniqueLinksClicked = data.UniqueLinksClicked || 0;

      // Open rate: cap at 100%
      const openRate = tracked > 0 ? Math.min((uniqueOpens / tracked) * 100, 100).toFixed(1) : '0.0';
      // Ensure values are always numbers
      const safeTotalTrackedLinks = Number.isFinite(totalTrackedLinks) ? totalTrackedLinks : 0;
      const safeUniqueLinksClicked = Number.isFinite(uniqueLinksClicked) ? uniqueLinksClicked : 0;
      const safeClickRate = safeTotalTrackedLinks > 0 ? Math.min((safeUniqueLinksClicked / safeTotalTrackedLinks) * 100, 100).toFixed(1) : '0.0';

      return {
        content: [{
          type: "text",
          text: `You sent ${sent} emails in the selected period.\nOut of ${tracked} emails with open tracking, ${openRate}% were opened.\nOut of ${safeTotalTrackedLinks} tracked links, ${safeUniqueLinksClicked} unique links were clicked (${safeClickRate}%).`
        }]
      };
    } catch (err) {
      return {
        content: [{ 
          type: "text", 
          text: `Error fetching delivery stats: ${err.toString()}` 
        }]
      };
    }
  }
);

/**
 * Get sent message history.
 *
 * @param {Object} params - Message history query parameters.
 * @param {number} [params.count=10] - Number of messages to retrieve.
 * @param {number} [params.offset=0] - Pagination offset.
 * @returns {Promise<Object>} List of recently sent outbound messages.
 * @throws {Error} If retrieval fails.
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

// =====================
// Domain Management Tools
// =====================

/**
 * Create a new sending domain.
 *
 * @param {Object} params - Domain creation parameters.
 * @param {string} params.name - Domain name to register.
 * @param {string} [params.returnPathDomain] - Optional return path domain.
 * @returns {Promise<Object>} Result object containing the new domain ID.
 * @throws {Error} If creation fails or required parameters are missing.
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
 * Verify domain DKIM setup.
 *
 * @param {Object} params
 * @param {number} params.domainId - ID of the domain to verify.
 * @returns {Promise<Object>} DKIM verification result.
 * @throws {Error} If verification fails or domain does not exist.
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
 * Verify domain return path setup.
 *
 * @param {Object} params
 * @param {number} params.domainId - ID of the domain to verify.
 * @returns {Promise<Object>} Return path verification result.
 * @throws {Error} If verification fails or domain does not exist.
 */
server.tool(
  "verifyDomainReturnPath",
  { domainId: z.number() },
  async ({ domainId }) => {
    const result = await client.verifyDomainReturnPath(domainId);
    return { content: [{ type: "text", text: `Return path verification: ${JSON.stringify(result)}` }] };
  }
);

// =====================
// Server Initialization
// =====================

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