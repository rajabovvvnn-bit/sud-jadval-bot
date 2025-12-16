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

// дам олиш кунларини чиқариш
function isWorkDay(date) {
  const d = date.getDay();
  return d !== 0 && d !== 6; // 0=yakshanba, 6=shanba
}

function formatDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

// API чақириш
async function fetchJadval(dateStr) {
  const url = `https://jadvalapi.sud.uz/vka/CIVIL/${regionId}/${dateStr}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  return await res.json();
}

// 10 иш куни текшириш
async function findNearestCourtDay() {
  let checkedDays = 0;
  let date = new Date();

  while (checkedDays < 10) {
    date.setDate(date.getDate() + 1);

    if (!isWorkDay(date)) continue;

    checkedDays++;
    const dateStr = formatDate(date);
    const result = await fetchJadval(dateStr);

    // 🔴 МУҲИМ ЖОЙ
    const list = result?.data || result;

    if (Array.isArray(list) && list.length > 0) {
      return { date: dateStr, count: list.length };
    }
  }

  return null;
}

// Telegram команда
bot.onText(/\/jadval|жадвал/i, async (msg) => {
  const chatId = msg.chat.id;

  await bot.sendMessage(chatId, "🔎 Яқин 10 иш куни текширилмоқда...");

  const found = await findNearestCourtDay();

  if (!found) {
    return bot.sendMessage(
      chatId,
      "❌ Яқин 10 иш куни ичида суд жадвали топилмади."
    );
  }

  bot.sendMessage(
    chatId,
    `✅ Суд жадвали топилди!\n\n📅 Сана: ${found.date}\n📂 Ишлар сони: ${found.count}`
  );
});

// сервер
app.listen(PORT, async () => {
  await bot.setWebHook(`${APP_URL}/bot${TOKEN}`);
  console.log("Bot ishga tushdi");
});
