import TelegramBot, {Message} from "node-telegram-bot-api";
import {db} from "@/db/db.js";
import {accounts} from "@/db/schema.js";
import {eq} from "drizzle-orm";

const token: string = '7746857100:AAGflmZ465_qZciGI2PCvhJS5Y5-JCHZxLU';
const bot = new TelegramBot(token, {polling: true});

bot.setMyCommands([
    {command: 'create_account', description: '/create_account {اسم الحساب} - إنشاء حساب جديد'},
    {command: 'list_accounts', description: '/list_accounts - عرض الحسابات'},
    {command: 'delete_account', description: '/delete_account {رقم الحساب} - حذف حساب'},
    {command: 'add_transaction', description: '/add_transaction {المبلغ} {الوصف} - إضافة عملية جديدة'},
    {command: 'list_transactions', description: '/list_transactions - عرض العمليات'},
    {command: 'delete_transaction', description: '/delete_transaction {رقم العملية} - حذف عملية'},
]);

// match /create_account without any arguments
bot.onText(/\/create_account$/, async (msg) => {
    await bot.sendMessage(msg.chat.id, 'خطأ: يجب إدخال اسم الحساب بعد الأمر');
});
bot.onText(/\/create_account (.+)/, async (msg, match) => {
    const accountName = match![1]!;

    await db.insert(accounts).values({
        userId: msg.from!.id,
        name: accountName,
    });

    await bot.sendMessage(msg.chat.id, 'تم إنشاء الحساب بنجاح');
});

bot.onText(/\/list_accounts/, async (msg) => {
    const userAccounts = await db.query.accounts.findMany({
        where: (account, {eq}) => eq(account.userId, msg.from!.id),
    })

    const accountNames = userAccounts.map(account =>
        `${account.id}: ${account.name}`
    ).join('\n');

    if (accountNames) {
        await bot.sendMessage(msg.chat.id, accountNames);
    } else {
        await bot.sendMessage(msg.chat.id, 'ليس لديك أي حسابات');
    }
});

bot.onText(/\/delete_account$/, async (msg) => {
    await bot.sendMessage(msg.chat.id, 'خطأ: يجب إدخال رقم الحساب بعد الأمر');
});
bot.onText(/\/delete_account (\d+)/, async (msg, match) => {
    const accountId = parseInt(match![1]!);

    await db.delete(accounts).where(eq(accounts.id, accountId));

    await bot.sendMessage(msg.chat.id, 'تم حذف الحساب بنجاح');
});
