import axios from "axios";
import * as cheerio from "cheerio";
import TelegramBot from "node-telegram-bot-api";
import express from "express";

const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

const app = express();
app.get("/", (req, res) => res.send("Бот ва Суд тизими фаол!"));
app.listen(process.env.PORT || 10000);

bot.deleteWebHook();

// Суд маълумотларини олиш функцияси (Lightweight версия)
async function getSudJadvalData() {
    try {
        const response = await axios.get('https://jadval2.sud.uz/fib/fib-jadval.html', {
            timeout: 10000,
            headers: {
                'Cookie': 'regionId=kkultfsud', // Қоракўл ФИБ
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const $ = cheerio.load(response.data);
        let results = [];
        $('table tbody tr').each((i, el) => {
            const cols = $(el).find('td');
            if (cols.length >= 4) {
                results.push({
                    time: $(cols[1]).text().trim(),
                    case: $(cols[2]).text().trim(),
                    judge: $(cols[3]).text().trim(),
                    parties: $(cols[4]).text().trim()
                });
            }
        });
        return results;
    } catch (e) {
        return null;
    }
}

// Хабарларни қайта ишлаш
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text ? msg.text.toLowerCase() : "";

    // 1. Агар фойдаланувчи жадвални сўраса
    if (text.includes("/jadval") || text.includes("жадвал")) {
        await bot.sendMessage(chatId, "🔎 Қоракўл туман ФИБ суди бўйича бугунги жадвал текширилмоқда...");
        const data = await getSudJadvalData();

        if (data && data.length > 0) {
            let resMsg = "📅 *Бугунги суд мажлислари:*\n\n";
            data.slice(0, 10).forEach((it, i) => {
                resMsg += `${i+1}. 📄 Иш: *${it.case}*\n⏰ Вақт: ${it.time}\n👨‍⚖️ Судья: ${it.judge}\n\n`;
            });
            return bot.sendMessage(chatId, resMsg, { parse_mode: "Markdown" });
        } else {
            return bot.sendMessage(chatId, "❌ Бугун учун очиқ суд мажлислари ҳақида маълумот топилмади ёки сайт вақтинча ишламаяпти.");
        }
    }

    // 2. Агар фойдаланувчи СИ (AI) билан гаплашмоқчи бўлса
    if (text === "/start") {
        return bot.sendMessage(chatId, "Ассалому алайкум, жаноб адвокат! Мен юридик СИ-ёрдамчиман. \n\n🔹 Суд жадвалини кўриш учун: /jadval\n🔹 Саволингиз бўлса, ёзаверинг.");
    }

    // 3. Бошқа ҳар қандай хабарга AI жавоби (Сиз аввал ишлатган AI логикасини шу ерга қўшинг)
    // Ҳозирча бот AI каби жавоб бериши учун оддий қайтариш қўямиз:
    // bot.sendMessage(chatId, "Саволингиз қабул қилинди. AI таҳлил қилмоқда...");
});
