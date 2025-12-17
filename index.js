import axios from "axios";
import * as cheerio from "cheerio";
import TelegramBot from "node-telegram-bot-api";
import express from "express";

const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

// Render учун веб-сервер
const app = express();
app.get("/", (req, res) => res.send("Бот Енгил Режимда Фаол!"));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Сервер ${PORT}-портда ишга тушди`));

// 409 Conflict хатосини олдини олиш
bot.deleteWebHook();

async function getSudDataLight() {
    try {
        // Сайтга Cookie билан сўров юбориш
        const response = await axios.get('https://jadval2.sud.uz/fib/fib-jadval.html', {
            timeout: 15000,
            headers: {
                'Cookie': 'regionId=kkultfsud', // Қоракўл туманини белгилаш
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://jadval2.sud.uz/fib/fib-jadval.html'
            }
        });

        const $ = cheerio.load(response.data);
        const results = [];

        // Жадвални сканерлаш
        $('table tbody tr').each((i, row) => {
            const cols = $(row).find('td');
            if (cols.length >= 4) {
                results.push({
                    time: $(cols[1]).text().trim(),
                    caseNumber: $(cols[2]).text().trim(),
                    judge: $(cols[3]).text().trim(),
                    parties: $(cols[4]).text().trim() || "Кўрсатилмаган"
                });
            }
        });

        return results;
    } catch (error) {
        console.error("❌ Хатолик юз берди:", error.message);
        return null;
    }
}

bot.onText(/\/jadval/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, "🚀 Тезкор қидирув бошланди, сайтдан маълумот оляпман...");

    const data = await getSudDataLight();
    
    if (data && data.length > 0) {
        let text = `📅 *Бугунги суд мажлислари жадвали:*\n\n`;
        data.slice(0, 10).forEach((item, i) => {
            text += `${i + 1}. 📄 Иш: *${item.caseNumber}*\n`;
            text += `   ⏰ Вақт: ${item.time}\n`;
            text += `   👨‍⚖️ Судья: ${item.judge}\n\n`;
        });
        bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
    } else {
        bot.sendMessage(chatId, "⚠️ Маълумот топилмади ёки сайт вақтинчалик блоклади. Илтимос, кейинроқ уриниб кўринг.");
    }
});

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Ассалому алайкум! Суд жадвалини кўриш учун /jadval буйруғини юборинг.");
});

console.log("🤖 Бот енгил режимда ишга тушди...");
