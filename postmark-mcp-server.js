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