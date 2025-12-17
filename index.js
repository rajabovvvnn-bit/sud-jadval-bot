import TelegramBot from "node-telegram-bot-api";
import puppeteer from "puppeteer";
import express from "express";

// 1. Созламалар
const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

// Render.com учун портни банд қилиш (ўчиб қолмаслиги учун)
const app = express();
app.get("/", (req, res) => res.send("Бот ва Виртуал Браузер фаол!"));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Сервер ${PORT}-портда ишга тушди`));

// 409 Conflict хатосини олдини олиш учун Webhook-ни тозалаш
bot.deleteWebHook().then(() => {
    console.log("🔄 Эски боғланишлар тозаланди. Бот тайёр.");
});

// 2. Браузер орқали маълумот олиш функцияси
async function scrapeSudJadval() {
    console.log("🌐 Браузер ишга тушмоқда...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    });

    const page = await browser.newPage();
    
    try {
        // Сайтга кириш
        await page.goto('https://jadval2.sud.uz/fib/fib-jadval.html', { 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });

        // Қоракўл туманини танлаш учун LocalStorage-ни созлаш
        await page.evaluate(() => {
            localStorage.setItem('regionId', 'kkultfsud');
        });

        // Саҳифани янгилаб, маълумотларни юклаш
        await page.reload({ waitUntil: 'networkidle2' });
        
        // Жадвал пайдо бўлишини кутиш (3 сония)
        await new Promise(r => setTimeout(r, 3000));

        // Жадвалдаги маълумотларни йиғиш
        const data = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tbody tr'));
            return rows.map(row => {
                const cols = row.querySelectorAll('td');
                if (cols.length >= 4) {
                    return {
                        time: cols[1]?.innerText.trim(),
                        caseNumber: cols[2]?.innerText.trim(),
                        judge: cols[3]?.innerText.trim(),
                        parties: cols[4]?.innerText.trim() || "Кўрсатилмаган"
                    };
                }
                return null;
            }).filter(item => item !== null);
        });

        await browser.close();
        return data;
    } catch (error) {
        console.error("❌ Скрапинг хатоси:", error.message);
        await browser.close();
        return null;
    }
}

// 3. Бот буйруқлари
bot.onText(/\/jadval/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId, "⏳ Браузер орқали Олий суд сайтига кирилмоқда... Бу 15-20 сония вақт олиши мумкин.");

    const results = await scrapeSudJadval();

    if (results && results.length > 0) {
        let responseText = `📅 *Бугунги суд мажлислари жадвали:*\n\n`;
        results.slice(0, 10).forEach((item, i) => {
            responseText += `${i + 1}. 📄 Иш: *${item.caseNumber}*\n`;
            responseText += `   ⏰ Вақт: ${item.time}\n`;
            responseText += `   👨‍⚖️ Судья: ${item.judge}\n`;
            responseText += `   👥 Тарафлар: ${item.parties}\n\n`;
        });
        bot.sendMessage(chatId, responseText, { parse_mode: "Markdown" });
    } else {
        bot.sendMessage(chatId, "⚠️ Ҳозирча маълумот топилмади ёки сайт юкланмади. Илтимос, бироздан сўнг қайта уриниб кўринг.");
    }
});

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Ассалому алайкум! Суд жадвалини кўриш учун /jadval буйруғини юборинг.");
});

console.log("🤖 Бот фаолият бошлади...");
