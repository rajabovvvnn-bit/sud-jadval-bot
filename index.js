import axios from "axios";
import * as cheerio from "cheerio";
import TelegramBot from "node-telegram-bot-api";
import express from "express";

const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

const app = express();
app.get("/", (req, res) => res.send("Суд қидирув тизими фаол!"));
app.listen(process.env.PORT || 10000);

bot.deleteWebHook();

// Келаси 10 кунлик саналарни олиш (YYYY-MM-DD форматида)
function getNext10Days() {
    const dates = [];
    for (let i = 0; i < 10; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        // Фақат иш кунларини (душанба-жума) текшириш учун:
        if (d.getDay() !== 0 && d.getDay() !== 6) {
            dates.push(d.toISOString().split('T')[0]);
        }
    }
    return dates;
}

// Маълум бир сана учун қидирув функцияси
async function checkSudByDate(date, query) {
    try {
        const response = await axios.get('https://jadval2.sud.uz/fib/fib-jadval.html', {
            timeout: 8000,
            headers: {
                'Cookie': `regionId=kkultfsud; date=${date}`, // Санани Cookie орқали бериш
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const matches = [];

        $('table tbody tr').each((i, el) => {
            const cols = $(el).find('td');
            if (cols.length >= 4) {
                const parties = $(cols[4]).text().toLowerCase();
                if (parties.includes(query.toLowerCase())) {
                    matches.push({
                        date: date,
                        time: $(cols[1]).text().trim(),
                        caseNumber: $(cols[2]).text().trim(),
                        judge: $(cols[3]).text().trim(),
                        parties: $(cols[4]).text().trim()
                    });
                }
            }
        });
        return matches;
    } catch (e) {
        return [];
    }
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith('/')) {
        if (text === "/start") {
            bot.sendMessage(chatId, "⚖️ **Суд мажлисини қидириш боти**\n\nИлтимос, Ф.И.О.нгизни лотин алифбосида, худди паспортдагидек киритинг:");
        }
        return;
    }

    await bot.sendMessage(chatId, `🔍 **${text}** бўйича яқин 10 кунлик суд жадваллари текширилмоқда... \n(Бу бироз вақт олиши мумкин)`);

    const days = getNext10Days();
    let foundAny = false;

    for (const date of days) {
        const results = await checkSudByDate(date, text);
        
        if (results.length > 0) {
            foundAny = true;
            for (const item of results) {
                let response = `✅ **Мажлис тайинланган!**\n\n`;
                response += `📅 **Сана:** ${item.date}\n`;
                response += `⏰ **Вақт:** ${item.time}\n`;
                response += `👨‍⚖️ **Судья:** ${item.judge}\n`;
                response += `📄 **Иш №:** ${item.caseNumber}\n`;
                response += `👥 **Тарафлар:** ${item.parties}`;
                await bot.sendMessage(chatId, response);
            }
        }
    }

    if (!foundAny) {
        bot.sendMessage(chatId, `❌ Яқин 10 кун ичида "${text}" иштирокида суд мажлиси топилмади.`);
    }
});
