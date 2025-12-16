import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";
import express from "express";

const TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL;
const PORT = process.env.PORT || 3000;

const bot = new TelegramBot(TOKEN);
const app = express();
app.use(express.json());

// ===== WEBHOOK =====
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ===== SUD SOZLAMALARI =====
const regionId = "kkultfsud";

// Sana форматлаш
function formatDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

// Dam olish kunimi?
function isWeekend(date) {
  const day = date.getDay(); // 0-ya, 6-sh
  return day === 0 || day === 6;
}

// API’dan жадвал олиш
async function getJadvalByDate(date) {
  const ymd = formatDate(date);
  const url = `https://jadvalapi.sud.uz/vka/CIVIL/${regionId}/${ymd}`;

  try {
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      timeout: 15000
    });

    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : null;
  } catch (e) {
    console.error("API xato:", e.message);
    return null;
  }
}

// ===== TELEGRAM KOMANDA =====
bot.onText(/\/jadval/, async (msg) => {
  const chatId = msg.chat.id;

  let foundDate = null;

  for (let i = 0; i < 10; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    if (isWeekend(date)) continue;

    const jadval = await getJadvalByDate(date);
    if (jadval) {
      foundDate = date;
      break;
    }
  }

  if (!foundDate) {
    return bot.sendMessage(
      chatId,
      "Яқин 10 иш куни ичида суд жадвали топилмади."
    );
  }

  const text =
    "⚖️ Суд куни аниқланди:\n\n" +
    `📅 Сана: ${foundDate.toLocaleDateString("uz-UZ")}\n` +
    "📍 Суд: Қоракўл тумани фуқаролик суди";

  bot.sendMessage(chatId, text);
});

// ===== SERVER START =====
app.listen(PORT, async () => {
  await bot.setWebHook(`${APP_URL}/bot${TOKEN}`);
  console.log("Webhook ишга тушди");
});
