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
   git clone <your-repo-url>
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

## License
MIT 