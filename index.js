import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";
import express from "express";

const TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL;
const PORT = process.env.PORT || 3000;

const bot = new TelegramBot(TOKEN);
const app = express();
app.use(express.json());

// webhook
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// суд параметри
const regionId = "kkultfsud";

// helpers
function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function isWeekend(d) {
  const day = d.getDay();
  return day === 0 || day === 6; // yakshanba / shanba
}

// API чақириш
async function fetchDay(dateStr) {
  const url = `https://jadvalapi.sud.uz/vka/CIVIL/${regionId}/${dateStr}`;
  const res = await fetch(url, {
    headers: { "Accept": "application/json" }
  });

  if (!res.ok) return null;
  return await res.json();
}

// 10 иш куни ичида қидириш
async function findNextCourtDay() {
  let checkedDays = 0;
  let date = new Date();

  while (checkedDays < 10) {
    date.setDate(date.getDate() + 1);

    if (isWeekend(date)) continue;

    checkedDays++;
    const dateStr = formatDate(date);

    const data = await fetchDay(dateStr);

    // API жавоби массив бўлса
    if (Array.isArray(data) && data.length > 0) {
      return { date: dateStr, list: data };
    }

    // API жавоби объект бўлса
    if (data && Array.isArray(data.data) && data.data.length > 0) {
      return { date: dateStr, list: data.data };
    }
  }

  return null;
}

// Telegram команда
bot.onText(/\/jadval|жадвал/i, async (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "🔍 Яқин 10 иш куни текширилмоқда...");

  const result = await findNextCourtDay();

  if (!result) {
    return bot.sendMessage(
      chatId,
      "❌ Яқин 10 иш куни ичида суд жадвали топилмади."
    );
  }

  const prettyDate =
    result.date.slice(6, 8) +
    "." +
    result.date.slice(4, 6) +
    "." +
    result.date.slice(0, 4);

  let text = `✅ Энг яқин суд куни:\n📅 ${prettyDate}\n\n`;

  result.list.slice(0, 5).forEach((i, idx) => {
    text += `${idx + 1}) ${i.caseNumber || "Иш"} ${i.time || ""}\n`;
  });

  bot.sendMessage(chatId, text);
});

// сервер
app.listen(PORT, async () => {
  await bot.setWebHook(`${APP_URL}/bot${TOKEN}`);
  console.log("Webhook ишга тушди");
});
