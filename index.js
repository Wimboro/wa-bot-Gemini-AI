require('dotenv').config();
const axios = require('axios');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const replies = require('./replies');
const emeteraiPromptTemplate = require('./prompt_template');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GREETING_IMAGE_URL = process.env.GREETING_IMAGE_URL;
const PAYMENT_IMAGE_URL = process.env.PAYMENT_IMAGE_URL;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { args: ['--no-sandbox'] }
});

const userStates = {};

// ✅ Function to get the current time using timeapi.io
async function getCurrentTime() {
  try {
    const response = await axios.get('https://timeapi.io/api/Time/current/zone?timeZone=Asia/Jakarta');
    const { date, time } = response.data;
    return `${date} ${time}`; // Format: "YYYY-MM-DD HH:mm:ss"
  } catch (error) {
    console.error('Error fetching current time:', error);
    return 'Unable to fetch time.';
  }
}

// Generate AI response using Gemini with current time from API
async function getGeminiResponse(userQuestion) {
  try {
    const currentTime = await getCurrentTime();

    const fullPrompt = emeteraiPromptTemplate
      .replace('{user_question}', userQuestion)
      .replace('{current_time}', currentTime);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(fullPrompt);
    
    return result.response.text();
  } catch (error) {
    console.error('Error generating AI response:', error);
    return null;
  }
}

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('Client ready!'));

client.on('message', async message => {
  if (!message.from.includes('@c.us')) return;

  const text = message.body.toLowerCase();
  const userId = message.from;

  if (!userStates[userId]) userStates[userId] = { active: true };

  if (text === 'stop') {
    userStates[userId].active = false;
    return client.sendMessage(userId, replies.stopMessage);
  }

  if (text === 'lanjut') {
    userStates[userId].active = true;
    return client.sendMessage(userId, replies.continueMessage);
  }

  if (!userStates[userId].active) return;

  if (['halo', 'selamat', 'assalamualaikum'].some(greet => text.includes(greet))) {
    const media = await MessageMedia.fromUrl(GREETING_IMAGE_URL);
    return client.sendMessage(userId, media, { caption: replies.greetingsCaption });
  }

  if (['pembayaran', 'bayar'].some(pay => text.includes(pay))) {
    const paymentMedia = await MessageMedia.fromUrl(PAYMENT_IMAGE_URL);
    return client.sendMessage(userId, paymentMedia, { caption: replies.paymentCaption });
  }

  if (!isNaN(text) && text >= 1 && text <= 6) {
    if (parseInt(text) === 6) {
      const paymentMedia = await MessageMedia.fromUrl(PAYMENT_IMAGE_URL);
      return client.sendMessage(userId, paymentMedia, { caption: replies.paymentCaption });
    } else {
      return client.sendMessage(userId, replies.optionResponses[parseInt(text)]);
    }
  }

  if (text === 'bantuan') {
    return client.sendMessage(userId, replies.options);
  }

  const aiResponse = await getGeminiResponse(message.body);
  if (aiResponse && aiResponse.length > 10) {
    await client.sendMessage(userId, aiResponse);
  } else {
    await client.sendMessage(userId, replies.defaultMessage);
  }

  if (userStates[userId].active) {
    await client.sendMessage(userId, replies.continuePrompt);
  }
});

client.initialize();

