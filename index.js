import axios from "axios";
import TelegramBot from "node-telegram-bot-api";
import express from "express";

// 1. Созламалар
const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });
const regionId = "kkultfsud"; // Қоракўл туман ФИБ суди

// Render учун оддий веб-сервер (порт 10000 ни банд қилиш учун)
const app = express();
app.get("/", (req, res) => res.send("Бот фаол ишламоқда!"));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Веб-сервер ${PORT}-портда ишга тушди`));

// 2. Иш кунларини аниқлаш
function getNextWorkDays(count = 10) {
    const days = [];
    let current = new Date();
    while (days.length < count) {
        current.setDate(current.getDate() + 1);
        if (current.getDay() !== 0 && current.getDay() !== 6) {
            days.push(new Date(current));
        }
    }
    return days;
}

// 3. API дан маълумот олиш (Кенгайтирилган Headers билан)
async function getSudJadval(date) {
    const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, "");
    const url = `https://jadvalapi.sud.uz/vka/CIVIL/${regionId}/${yyyymmdd}`;

    try {
        const res = await axios.get(url, {
            timeout: 10000, // 10 сония кутиш
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json, text/plain, */*",
                "Referer": "https://jadval2.sud.uz/",
                "Origin": "https://jadval2.sud.uz"
            }
        });
        
        return res.data && res.data.length ? res.data : null;
    } catch (e) {
        // Хатолик турини аниқлаш
        if (e.response) {
            console.error(`❌ API Хато (Статус ${e.response.status}): Блокланган бўлиши мумкин.`);
        } else if (e.request) {
            console.error("❌ API Хато: Сервер жавоб бермаяпти (Timeout). Эҳтимол IP блокланган.");
        } else {
            console.error("❌ Хатолик:", e.message);
        }
        return null;
    }
}

// 4. Бот буйруқлари
bot.onText(/\/jadval/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, "🔎 Суд жадвали текширилмоқда, илтимос кутинг...");

    const workDays = getNextWorkDays(7); // Тезроқ ишлаши учун 7 кунлик қиламиз
    let found = false;

    for (let date of workDays) {
        const data = await getSudJadval(date);
        if (data) {
            found = true;
            let text = `📅 *${date.toLocaleDateString()}* санасига жадвал:\n\n`;
            data.slice(0, 10).forEach((item, i) => {
                text += `${i + 1}) 🧾 Иш №: *${item.caseNumber || "—"}*\n`;
                text += `⏰ Вақт: ${item.time || "—"}\n`;
                text += `👨‍⚖️ Судья: ${item.judge || "—"}\n\n`;
            });
            await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
            break; 
        }
    }

    if (!found) {
        await bot.sendMessage(chatId, "❌ Яқин кунлар ичида очиқ суд мажлислари топилмади ёки тизимга кириш имкони бўлмади.");
    }
});

bot.on("message", (msg) => {
    if (msg.text === "/start") {
        bot.sendMessage(msg.chat.id, "Хуш келибсиз! Суд мажлислари жадвалини кўриш учун /jadval буйруғини юборинг.");
    }
});

console.log("🚀 Бот ишга тушди...");
