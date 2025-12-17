import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";
import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL || "https://your-app.onrender.com";

// Bot webhook rejimida
const bot = new TelegramBot(TOKEN, { webHook: true });
bot.setWebHook(`${WEBHOOK_URL}/bot${TOKEN}`);

const regionId = "kkultfsud";

app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("Sud Jadval Bot ishlayapti ✅");
});

// Webhook endpoint
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

/* ================= HELPERS ================= */

// Ish kunini tekshirish
function isWorkDay(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

// Keyingi N ta ish kunini olish
function getNextWorkDays(count = 10) {
  const days = [];
  let current = new Date();
  while (days.length < count) {
    current.setDate(current.getDate() + 1);
    if (isWorkDay(current)) {
      days.push(new Date(current));
    }
  }
  return days;
}

// API dan jadval olish
async function getSudJadval(date) {
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const url = `https://jadvalapi.sud.uz/vka/CIVIL/${regionId}/${yyyymmdd}`;
  
  console.log(`🔍 [API] So'rov: ${url}`);
  
  try {
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      timeout: 10000
    });
    
    console.log(`📊 [API] Status: ${res.status}`);
    
    if (!res.ok) {
      console.error(`❌ [API] Xato: ${res.status} ${res.statusText}`);
      return null;
    }
    
    const data = await res.json();
    console.log(`✅ [API] Ma'lumot olindi: ${data.length} ta yozuv`);
    
    return data.length ? data : null;
  } catch (e) {
    console.error(`❌ [API] Xato: ${e.message}`);
    return null;
  }
}

// 10 ish kunini tekshirish
async function checkNext10WorkDays(chatId) {
  console.log(`📅 [BOT] 10 kun tekshiruvi boshlandi: Chat ${chatId}`);
  
  await bot.sendMessage(chatId, "🔎 Яқин 10 иш куни текширилмоқда...");
  
  const workDays = getNextWorkDays(10);
  
  for (let date of workDays) {
    const data = await getSudJadval(date);
    
    if (data) {
      let text = `📅 *${date.toLocaleDateString('uz-UZ')}* санасига суд жадвали:\n\n`;
      
      data.slice(0, 5).forEach((item, i) => {
        text += `${i + 1}. 🧾 Иш рақами: \`${item.caseNumber || "—"}\`\n`;
        text += `   ⏰ Вақт: ${item.time || "—"}\n`;
        text += `   👨‍⚖️ Судья: ${item.judge || "—"}\n`;
        text += `   📍 Зал: ${item.room || "—"}\n\n`;
      });
      
      if (data.length > 5) {
        text += `_... ва яна ${data.length - 5} та иш_\n`;
      }
      
      await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
      console.log(`✅ [BOT] Jadval yuborildi: ${date.toLocaleDateString()}`);
      return;
    }
  }
  
  await bot.sendMessage(chatId, "❌ Яқин 10 иш куни ичида суд жадвали топилмади.");
  console.log(`⚠️ [BOT] Jadval topilmadi`);
}

/* ================= BOT LOGIC ================= */

// /start buyrug'i
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || "Foydalanuvchi";
  
  await bot.sendMessage(
    chatId,
    `Ассалому алайкум, ${firstName}! 👋\n\n` +
    `Мен Қорақўл туман суди жадвалини кўрсатувчи ботман.\n\n` +
    `📋 Буйруқлар:\n` +
    `/jadval - Яқин 10 иш кунидаги суд жадвали\n` +
    `/help - Ёрдам`
  );
});

// /help buyrug'i
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  
  await bot.sendMessage(
    chatId,
    `⚖️ *Суд жадвали боти*\n\n` +
    `Бу бот Ўзбекистон Олий суди сайтидан Қорақўл туман фуқаролик суди жадвалини олиб беради.\n\n` +
    `📋 Буйруқлар:\n` +
    `/jadval - Яқин суд жадвалини кўриш\n` +
    `/start - Бошлаш\n\n` +
    `📞 Саволлар учун: @termezadvokat`,
    { parse_mode: "Markdown" }
  );
});

// /jadval buyrug'i
bot.onText(/\/jadval/, async (msg) => {
  const chatId = msg.chat.id;
  console.log(`📨 [BOT] /jadval so'rovi: User ${msg.from.id}`);
  
  await checkNext10WorkDays(chatId);
});

// Oddiy xabarlarga javob
bot.on("message", async (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;
  
  if (!text || text.startsWith("/")) return;
  
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("салом") || lowerText.includes("привет")) {
    await bot.sendMessage(
      chatId,
      "Ассалому алайкум! 👋\n\nСуд жадвалини кўриш учун /jadval буйруғини юборинг."
    );
  } else if (lowerText.includes("жадвал") || lowerText.includes("jadval")) {
    await checkNext10WorkDays(chatId);
  } else {
    await bot.sendMessage(
      chatId,
      "⚖️ Суд жадвалини кўриш учун /jadval ёки /help ёзинг."
    );
  }
});

/* ================= SERVER ================= */

app.listen(PORT, () => {
  console.log(`✅ Server ${PORT}-portda ishlamoqda`);
  console.log(`🔗 Webhook: ${WEBHOOK_URL}/bot${TOKEN}`);
  console.log(`📍 Region: ${regionId}`);
});

// Xatoliklarni ushlash
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
});
