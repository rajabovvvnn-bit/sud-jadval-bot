import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";

const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

const regionId = "kkultfsud";

async function getSudJadval() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const url = `https://jadvalapi.sud.uz/vka/CIVIL/${regionId}/${date}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    console.error("API xato:", e.message);
    return null;
  }
}

bot.onText(/\/jadval/, async (msg) => {
  const chatId = msg.chat.id;
  const data = await getSudJadval();

  if (!data || data.length === 0) {
    return bot.sendMessage(chatId, "Бугунга суд жадвали топилмади.");
  }

  let text = "📅 Бугунги суд жадвали:\n\n";

  data.slice(0, 5).forEach((item, i) => {
    text += `${i + 1}) 🧾 ${item.caseNumber || "—"}\n`;
    text += `⏰ ${item.time || "—"}\n`;
    text += `👨‍⚖️ Судья: ${item.judge || "—"}\n\n`;
  });

  bot.sendMessage(chatId, text);
});

console.log("Bot ishga tushdi");

