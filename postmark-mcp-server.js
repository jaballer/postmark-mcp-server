#!/usr/bin/env node

import 'dotenv/config'; // Loads environment variables from .env if present

/**
 * Postmark MCP Server
 * An MCP server implementation for Postmark email services
 *
 * See README.md for environment variable setup instructions.
 *
 * Author: [Your Name]
 * Version: 1.0.0
 * License: MIT
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import postmark from "postmark";
import fetch from "node-fetch";

// Postmark config
const serverToken = process.env.POSTMARK_SERVER_TOKEN;
const defaultSender = process.env.DEFAULT_SENDER_EMAIL;
const defaultMessageStream = process.env.DEFAULT_MESSAGE_STREAM;

if (!serverToken) {
  throw new Error('POSTMARK_SERVER_TOKEN is not set. Please configure it in your .env file.');
}
if (!defaultSender) {
  throw new Error('DEFAULT_SENDER_EMAIL is not set. Please configure it in your .env file.');
}
if (!defaultMessageStream) {
  throw new Error('DEFAULT_MESSAGE_STREAM is not set. Please configure it in your .env file.');
}

const client = new postmark.ServerClient(serverToken);

const server = new McpServer({
  name: "postmark-mcp",
  version: "1.0.0"
});

// Register the sendEmail tool
server.tool(
  "sendEmail",
  {
    to: z.string().email(),
    subject: z.string(),
    textBody: z.string(),
    from: z.string().optional(),
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

// Register the sendEmail tool
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

// Template Management
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

server.tool(
  "listTemplates",
  {},
  async () => {
    const result = await client.getTemplates();
    return { content: [{ type: "text", text: JSON.stringify(result.Templates) }] };
  }
);

server.tool(
  "getTemplate",
  { templateId: z.number() },
  async ({ templateId }) => {
    const result = await client.getTemplate(templateId);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
);

// Statistics & Tracking (custom delivery stats tool)
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

// Domain Management
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

server.tool(
  "verifyDomainDKIM",
  { domainId: z.number() },
  async ({ domainId }) => {
    const result = await client.verifyDomainDKIM(domainId);
    return { content: [{ type: "text", text: `DKIM verification: ${JSON.stringify(result)}` }] };
  }
);

server.tool(
  "verifyDomainReturnPath",
  { domainId: z.number() },
  async ({ domainId }) => {
    const result = await client.verifyDomainReturnPath(domainId);
    return { content: [{ type: "text", text: `Return path verification: ${JSON.stringify(result)}` }] };
  }
);

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