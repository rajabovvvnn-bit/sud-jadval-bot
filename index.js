import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";
import express from "express";

const TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL;

const bot = new TelegramBot(TOKEN);
const app = express();

app.use(express.json());

// Webhook endpoint
app.post(`/bot${TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Суд параметри
const regionId = "kkultfsud";

async function getSudJadval() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const url = `https://jadvalapi.sud.uz/vka/CIVIL/${regionId}/${date}`;

  const res = await fetch(url, {
    headers: { "Accept": "application/json" }
  });
  return await res.json();
}

bot.onText(/\/jadval/, async (msg) => {
  const chatId = msg.chat.id;
  const data = await getSudJadval();

  if (!data || data.length === 0) {
    return bot.sendMessage(chatId, "Бугунга суд жадвали топилмади.");
  }

  let text = "📅 Бугунги суд жадвали:\n\n";
  data.slice(0, 5).forEach((i, idx) => {
    text += `${idx + 1}) ${i.caseNumber || "—"} | ${i.time || "—"}\n`;
  });

  bot.sendMessage(chatId, text);
});

// Start server
app.listen(PORT, async () => {
  await bot.setWebHook(`${APP_URL}/bot${TOKEN}`);
  console.log("Webhook ишга тушди");
});
