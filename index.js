import fetch from "node-fetch";
import TelegramBot from "node-telegram-bot-api";

const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

const regionId = "kkultfsud"; // Суд турини танлаш учун, зарур бўлса динамик қилиши мумкин

// Иш куними текшириш функцияси
function isWorkDay(date) {
  const day = date.getDay(); // 0 = якшанба, 6 = шанба
  return day !== 0 && day !== 6;
}

// Бугундан бошлаб яқин 10 иш куни рўйхатини олиш
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

// API дан маълумот олиш функцияси
async function getSudJadval(date) {
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const url = `https://jadvalapi.sud.uz/vka/CIVIL/${regionId}/${yyyymmdd}`;

  try {
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0"
      }
    });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    return data.length ? data : null;
  } catch (e) {
    console.error("API xato:", e.message);
    return null;
  }
}

// Фойдаланувчига хабар бериш функцияси
async function checkNext10WorkDays(chatId) {
  await bot.sendMessage(chatId, "🔎 Яқин 10 иш куни текширилмоқда...");

  const workDays = getNextWorkDays(10);
  for (let date of workDays) {
    const data = await getSudJadval(date);
    if (data) {
      let text = `📅 ${date.toLocaleDateString()} санасига суд жадвали:\n\n`;
      data.slice(0, 5).forEach((item, i) => {
        text += `${i + 1}) 🧾 ${item.caseNumber || "—"}\n`;
        text += `⏰ ${item.time || "—"}\n`;
        text += `👨‍⚖️ Судья: ${item.judge || "—"}\n\n`;
      });
      await bot.sendMessage(chatId, text);
      return;
    }
  }

  await bot.sendMessage(chatId, "❌ Яқин 10 иш куни ичида суд жадвали топилмади.");
}

// /jadval буйруғи
bot.onText(/\/jadval/, async (msg) => {
  const chatId = msg.chat.id;
  checkNext10WorkDays(chatId);
});

// Салом ва бошқа хабарларга оддий жавоб
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text.toLowerCase();

  if (text.includes("салом") || text.includes("привет")) {
    bot.sendMessage(chatId, "Салом! /jadval ёзиб суд жадвалини олишингиз мумкин.");
  } else if (!text.startsWith("/jadval")) {
    bot.sendMessage(chatId, "⚖️ Суд ҳақида саволингиз бўлса /jadval ёзинг.");
  }
});

console.log("Bot ishga tushdi");
