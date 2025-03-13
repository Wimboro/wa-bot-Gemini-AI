const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require("@google/generative-ai");

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
    await client.sendMessage(message.from, 'Bot stopped. Type "lanjut" to continue.');
    return;
  }

  if (text === 'lanjut') {
    userStates[userId].active = true;
    await client.sendMessage(message.from, 'Bot continued. How can I help?');
    return;
  }

  if (!userStates[userId].active) return;

  if (['halo', 'selamat', 'assalamualaikum'].some(greet => text.includes(greet))) {
    const imageUrl = 'https://example.com/e-meterai-product.jpg';
    const media = await MessageMedia.fromUrl(imageUrl);
    await client.sendMessage(message.from, media, { 
      caption: `Ini Caption untuk gambar.`
    });
  } else if (['pembayaran', 'bayar'].some(pay => text.includes(pay))) {
    const paymentImageUrl = 'https://example.com/payment-qr-code.jpg';
    const paymentMedia = await MessageMedia.fromUrl(paymentImageUrl);
    await client.sendMessage(message.from, paymentMedia, { 
      caption: 'Payment methods. Scan QR code to pay.'
    });
  } else if (!isNaN(text) && text >= 1 && text <= 6) {
    const option = parseInt(text);
    let response;

    switch (option) {
      case 1: response = 'E-meterai: electronic stamp for official docs.'; break;
      case 2: response = 'Buy E-meterai via our site or customer service.'; break;
      case 3: response = 'E-meterai price varies. Contact us for latest.'; break;
      case 4: response = 'E-meterai delivery: 2-3 business days.'; break;
      case 5: response = '30-day money-back guarantee if unsatisfied.'; break;
      case 6:
        const paymentImageUrl = 'https://example.com/payment-qr-code.jpg';
        const paymentMedia = await MessageMedia.fromUrl(paymentImageUrl);
        await client.sendMessage(message.from, paymentMedia, { 
          caption: 'Payment methods. Scan QR code to pay.'
        });
        return;
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
        await client.sendMessage(message.from, 'Sorry, I don\'t understand. Try again or contact customer service.');
      }
    }
  }

  if (userStates[userId].active) {
    await client.sendMessage(message.from, 'Continue with bot? Type "stop" to stop or "lanjut" to continue.');
  }
});

async function getGeminiResponse(prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro"});
    const result = await model.generateContent(`Masukkan input untuk perintah bot ${prompt}`);
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
  const faq = {
    'apa itu e-meterai': 'E-meterai: cap elektronik untuk dokumen resmi.',
    'bagaimana cara membeli': 'Beli E-meterai via situs kami atau layanan pelanggan.',
    'harga': 'Harga E-meterai bervariasi. Hubungi kami untuk harga terbaru.',
    'waktu pengiriman': 'Pengiriman E-meterai: 2-3 hari kerja.',
    'kebijakan pengembalian': 'Jaminan uang kembali 30 hari jika tidak puas.'
  };

  return faq[query] || null;
}

async function sendOptions(message) {
  const options = `
Pilih opsi:
1. Info E-meterai
2. Cara beli
3. Harga
4. Pengiriman
5. Pengembalian
6. Pembayaran

Ketik nomor opsi.
`;

  await client.sendMessage(message.from, options);
}

client.initialize();