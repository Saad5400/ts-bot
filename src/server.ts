import TelegramBot from "node-telegram-bot-api";
import {db} from "@/db/db.js";
import {tasks, TaskStatus} from "@/db/schema.js";
import {and, eq} from "drizzle-orm";

const token: string = '7769069096:AAHtLrVNMtwSf6MG8dVQO6XIJcNQzfgLQSM';
const bot = new TelegramBot(token, {polling: true});

bot.onText(/\/start/, async (msg) => {
    await bot.sendMessage(msg.chat.id, 'Hello, world!');
});

bot.onText(/[ا|إ|أ]ضافة مهمة (.+)/, async (msg, match) => {
    const title = match![1]!;

    await db.insert(tasks).values({
        title: title,
        chatId: msg.chat.id,
    });

    await bot.sendMessage(msg.chat.id, 'تمت إضافة المهمة');
});

bot.onText(/عرض المهام/, async (msg) => {
    const taskList = await db.query.tasks.findMany({
        where: (task) => and(eq(task.chatId, msg.chat.id), eq(task.status, TaskStatus.Pending)),
    })

    if (taskList.length === 0) {
        await bot.sendMessage(msg.chat.id, 'لا يوجد مهام');
        return;
    }

    let message = '';
    taskList.forEach((task, index) => {
        message += `${index}. ${task.title}\n`;
    });

    await bot.sendMessage(msg.chat.id, message);
});

bot.onText(/[ا|إ|أ]لغاء مهمة (\d+)/, async (msg, match) => {
    const index = parseInt(match![1]!);
    const taskList = await db.query.tasks.findMany({
        where: (task) => eq(task.chatId, msg.chat.id),
    });

    if (taskList.length === 0) {
        await bot.sendMessage(msg.chat.id, 'لا يوجد مهام');
        return;
    }

    if (index >= taskList.length) {
        await bot.sendMessage(msg.chat.id, 'الرقم غير صحيح');
        return;
    }

    const task = taskList[index]!;
    await db.update(tasks).set({
        status: TaskStatus.Cancelled,
    }).where(eq(tasks.id, task.id));

    await bot.sendMessage(msg.chat.id, 'تم إلغاء المهمة');
});

bot.onText(/[ا|إ|أ]كمال مهمة (\d+)/, async (msg, match) => {
    const index =  parseInt(match![1]!);
    const taskList = await db.query.tasks.findMany({
        where: (task) => eq(task.chatId, msg.chat.id),
    });

    if (taskList.length === 0) {
        await bot.sendMessage(msg.chat.id, 'لا يوجد مهام');
        return;
    }

    if (index >= taskList.length) {
        await bot.sendMessage(msg.chat.id, 'الرقم غير صحيح');
        return;
    }

    const task = taskList[index]!;
    await db.update(tasks).set({
        status: TaskStatus.Completed,
    }).where(eq(tasks.id, task.id));

    await bot.sendMessage(msg.chat.id, 'تم الانتهاء من المهمة');
});