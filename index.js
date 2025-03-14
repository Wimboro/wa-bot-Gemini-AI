// index.js

require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const replies = require('./replies.json');
const prompts = require('./prompt.json');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox'] }
});

const userStates = {};

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('Client ready!'));

client.on('message', async message => {
  if (!message.from.includes('@c.us')) return;

  const text = message.body.toLowerCase();
  const userId = message.from;

  if (!userStates[userId]) userStates[userId] = { active: true };

  if (text === 'stop') {
    userStates[userId].active = false;
    await client.sendMessage(message.from, replies.stopMessage);
    return;
  }

  if (text === 'lanjut') {
    userStates[userId].active = true;
    await client.sendMessage(message.from, replies.continueMessage);
    return;
  }

  if (!userStates[userId].active) return;

  if (['halo', 'selamat', 'assalamualaikum'].some(greet => text.includes(greet))) {
    const imageUrl = 'https://example.com/e-meterai-product.jpg';
    const media = await MessageMedia.fromUrl(imageUrl);
    await client.sendMessage(message.from, media, { 
      caption: replies.greetingsCaption
    });
  } else if (['pembayaran', 'bayar'].some(pay => text.includes(pay))) {
    const paymentImageUrl = 'https://example.com/payment-qr-code.jpg';
    const paymentMedia = await MessageMedia.fromUrl(paymentImageUrl);
    await client.sendMessage(message.from, paymentMedia, { 
      caption: replies.paymentCaption
    });
  } else if (!isNaN(text) && text >= 1 && text <= 6) {
    const option = parseInt(text);
    let response;

    if (option === 6) {
      const paymentImageUrl = 'https://example.com/payment-qr-code.jpg';
      const paymentMedia = await MessageMedia.fromUrl(paymentImageUrl);
      await client.sendMessage(message.from, paymentMedia, { 
        caption: replies.paymentCaption
      });
      return;
    } else {
      response = replies.optionResponses[option];
    }

    await client.sendMessage(message.from, response);
  } else if (text === 'bantuan') {
    await sendOptions(message);
  } else {
    const response = await getGeminiResponse(message.body);
    if (response && validateResponse(response)) {
      await client.sendMessage(message.from, response);
    } else {
      const faqResponse = getResponse(text);
      if (faqResponse) {
        await client.sendMessage(message.from, faqResponse);
      } else {
        await client.sendMessage(message.from, replies.defaultMessage);
      }
    }
  }

  if (userStates[userId].active) {
    await client.sendMessage(message.from, replies.continuePrompt);
  }
});

async function getGeminiResponse(prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro"});
    const fullPrompt = prompts.eMeteraiPrompt.replace('{{prompt}}', prompt);
    const result = await model.generateContent(fullPrompt);
    return (await result.response).text();
  } catch (error) {
    console.error('Gemini AI error:', error);
    return null;
  }
}

function validateResponse(response) {
  return response.length > 10 && response.includes('E-meterai');
}

function getResponse(query) {
  return replies.faq[query] || null;
}

async function sendOptions(message) {
  await client.sendMessage(message.from, replies.options);
}

client.initialize();