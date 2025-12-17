import TelegramBot from "node-telegram-bot-api";
import puppeteer from "puppeteer";
import express from "express";

const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

const app = express();
app.get("/", (req, res) => res.send("Бот ва Профессионал Браузер ишламоқда!"));
app.listen(process.env.PORT || 10000);

bot.deleteWebHook();

async function searchInBrowser(fio) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    const query = fio.toLowerCase();
    let allMatches = [];

    try {
        await page.goto('https://jadval2.sud.uz/fib/fib-jadval.html', { waitUntil: 'networkidle2' });
        
        // Суд тури ва ҳудудни созлаш
        await page.evaluate(() => {
            localStorage.setItem('regionId', 'kkultfsud'); // Қоракўл ФИБ
        });
        await page.reload({ waitUntil: 'networkidle2' });

        // Яқин 10 кунни текшириш (Сайтдаги сана танлагич орқали)
        for (let i = 0; i < 10; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            // Санани танлаш ва юкланишини кутиш
            await page.evaluate((d) => {
                const dateInput = document.querySelector('#date');
                if (dateInput) {
                    dateInput.value = d;
                    dateInput.dispatchEvent(new Event('change'));
                }
            }, dateStr);

            await new Promise(r => setTimeout(r, 2000)); // Жадвал юкланиши учун 2 сония кутиш

            const results = await page.evaluate((q) => {
                const rows = Array.from(document.querySelectorAll('table tbody tr'));
                return rows.map(row => {
                    const cols = row.querySelectorAll('td');
                    const parties = cols[4]?.innerText || "";
                    if (parties.toLowerCase().includes(q)) {
                        return {
                            time: cols[1]?.innerText,
                            caseNo: cols[2]?.innerText,
                            judge: cols[3]?.innerText,
                            parties: parties
                        };
                    }
                    return null;
                }).filter(x => x !== null);
            }, query);

            if (results.length > 0) {
                results.forEach(r => allMatches.push({...r, date: dateStr}));
            }
        }
    } catch (e) {
        console.error("Браузер хатоси:", e);
    } finally {
        await browser.close();
    }
    return allMatches;
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith('/')) return;

    await bot.sendMessage(chatId, `🔍 **${text}** исми бўйича яқин 10 кунлик жадвалларни титкилаяпман... \n(Браузер ишга тушди, бироз кутинг)`);
    
    const found = await searchInBrowser(text);

    if (found.length > 0) {
        found.forEach(item => {
            let m = `✅ **Мажлис топилди!**\n\n📅 Сана: ${item.date}\n⏰ Вақт: ${item.time}\n👨‍⚖️ Судья: ${item.judge}\n📄 Иш №: ${item.caseNo}\n👥 Тарафлар: ${item.parties}`;
            bot.sendMessage(chatId, m);
        });
    } else {
        bot.sendMessage(chatId, `❌ "${text}" бўйича яқин 10 кун ичида мажлис топилмади. Исмингиз лотинчада паспортдагидек ёзилганига амин бўлинг.`);
    }
});
