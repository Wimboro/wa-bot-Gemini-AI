# WhatsApp E-meterai Bot

A WhatsApp bot for E-meterai customer service, built with Node.js and the `whatsapp-web.js` library. It uses Gemini AI for generating responses and provides options for users to select.

## Features

- Responds to greetings with an E-meterai product image
- Answers common questions about E-meterai
- Provides payment options with a QR code
- Allows users to stop and continue the bot
- Offers a menu of options when the user types "bantuan"

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/wimboro/wa-bot-Gemini-AI.git
   cd wa-bot-Gemini-AI
   npm install
3. Copy .env.example and rename .env
4. Change GEMINI_API_KEY=your_api_key_here with your Gemini API
5. change GREETING_IMAGE_URL and PAYMENT_IMAGE_URL with your image link