// 0 = якшанба, 6 = шанба
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

async function getNext10WorkingDays() {
  const days = [];
  let current = new Date();

  while (days.length < 10) {
    current.setDate(current.getDate() + 1);

    if (!isWeekend(current)) {
      days.push(new Date(current));
    }
  }

  return days;
}

bot.onText(/\/jadval/, async (msg) => {
  const chatId = msg.chat.id;

  const days = await getNext10WorkingDays();
  let found = [];

  for (const day of days) {
    const dateStr = formatDate(day);
    const url = `https://jadvalapi.sud.uz/vka/CIVIL/kkultfsud/${dateStr}`;

    try {
      const res = await fetch(url, {
        headers: { "Accept": "application/json" }
      });

      if (!res.ok) continue;

      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        found.push({
          date: day.toLocaleDateString("uz-UZ"),
          count: data.length
        });
      }
    } catch (e) {
      console.error("Xato:", dateStr, e.message);
    }
  }

  if (found.length === 0) {
    return bot.sendMessage(
      chatId,
      "Яқин 10 иш куни ичида ушбу суд учун суд ишлари топилмади."
    );
  }

  let text = "📅 Яқин кунларда суд ишлари бор:\n\n";

  found.forEach((f) => {
    text += `🗓 ${f.date} — ${f.count} та иш\n`;
  });

  bot.sendMessage(chatId, text);
});
