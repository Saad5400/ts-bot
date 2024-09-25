import TelegramBot, {BotCommand, Message} from "node-telegram-bot-api";
import {db} from "@/db/db.js";
import {accounts, transactions} from "@/db/schema.js";
import {eq} from "drizzle-orm";

const token: string = '7746857100:AAGflmZ465_qZciGI2PCvhJS5Y5-JCHZxLU';
const bot = new TelegramBot(token, {polling: true});

const commands: BotCommand[] = [
    {command: 'create_account', description: '{اسم الحساب} - إنشاء حساب جديد'},
    {command: 'list_accounts', description: '- عرض الحسابات'},
    {command: 'delete_account', description: '{اسم الحساب} - حذف حساب'},
    {command: 'add_transaction', description: '{التصنيف} {المبلغ} {الوصف} - إضافة عملية جديدة'},
    {command: 'list_transactions', description: '- عرض العمليات'},
    {command: 'delete_transaction', description: '{رقم العملية} - حذف عملية'},
];
bot.setMyCommands([
    {command: 'start', description: 'عرض الأوامر المتاحة'},
    ...commands,
]);

bot.onText(/\/start/, async (msg) => {
    const commandsList = commands.map(command => `/${command.command}: ${command.description}`).join('\n');
    await bot.sendMessage(msg.chat.id, `مرحباً بك في بوت المحفظة لتتبع المصاريف\n\n${commandsList}`);
});

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
        where: (account) => eq(account.userId, msg.from!.id),
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
    await bot.sendMessage(msg.chat.id, 'خطأ: يجب إدخال اسم الحساب بعد الأمر');
});
bot.onText(/\/delete_account (.+)/, async (msg, match) => {
    const accountName = match![1]!;

    const userAccounts = await db.query.accounts.findMany({
        where: (account) => eq(account.userId, msg.from!.id),
    });
    const accountToDelete = userAccounts.find(account => account.name === accountName);

    if (!accountToDelete) {
        await bot.sendMessage(msg.chat.id, 'خطأ: الحساب غير موجود');
        return;
    }

    await db.delete(accounts).where(eq(accounts.id, accountToDelete.id));

    await bot.sendMessage(msg.chat.id, 'تم حذف الحساب بنجاح');
});

bot.onText(/\/add_transaction$/, async (msg) => {
    await bot.sendMessage(msg.chat.id, 'خطأ: يجب إدخال التصنيف والمبلغ والوصف بعد الأمر');
});
bot.onText(/\/add_transaction (.+?) (\d+) (.*)/, async (msg, match) => {
    const category = match![1]!;
    const amount = parseInt(match![2]!);
    const description = match![3];

    const userAccounts = await db.query.accounts.findMany({
        where: (account) => eq(account.userId, msg.from!.id),
    });
    if (userAccounts.length === 0) {
        await bot.sendMessage(msg.chat.id, 'خطأ: ليس لديك حسابات');
        return;
    }

    const accountPrompt = await bot.sendMessage(msg.chat.id,
        `سيتم إضافة العملية للحساب التالي: ${userAccounts[0]!.name} بعد 10 ثواني، لتغيير الحساب الرجاء الرد على هذه الرسالة باسم الحساب`);
    const listener = bot.onReplyToMessage(msg.chat.id, accountPrompt.message_id, async (reply) => {
        const accountName = reply.text;

        const account = userAccounts.find(account => account.name === accountName);
        if (!account) {
            await bot.sendMessage(msg.chat.id, 'خطأ: الحساب غير موجود');
            return;
        }

        await db.insert(transactions).values({
            accountId: account.id,
            amount: amount,
            description: description,
            category: category,
            date: new Date().toISOString(),
        });

        await bot.sendMessage(msg.chat.id, 'تمت إضافة العملية بنجاح');
        bot.removeReplyListener(listener);
        clearTimeout(timeout);
    });
    const timeout = setTimeout(async () => {
        bot.removeReplyListener(listener);
        await db.insert(transactions).values({
            accountId: userAccounts[0]!.id,
            amount: amount,
            description: description,
            category: category,
            date: new Date().toISOString(),
        });

        await bot.sendMessage(msg.chat.id, 'تمت إضافة العملية بنجاح');
    }, 10000);
});

bot.onText(/\/list_transactions/, async (msg) => {
    const userAccounts = await db.query.accounts.findMany({
        where: (account) => eq(account.userId, msg.from!.id),
    });
    if (userAccounts.length === 0) {
        await bot.sendMessage(msg.chat.id, 'خطأ: ليس لديك حسابات');
        return;
    }

    const userTransactions = await db.query.transactions.findMany({
        where: (transaction) => eq(transaction.accountId, userAccounts[0]!.id),
    });

    const transactionsList = userTransactions.map(transaction =>
        `${transaction.id}: ${transaction.amount} ${transaction.category} - ${transaction.description}`
    ).join('\n');

    if (transactionsList) {
        await bot.sendMessage(msg.chat.id, transactionsList);
    } else {
        await bot.sendMessage(msg.chat.id, 'ليس لديك أي عمليات');
    }
});

bot.onText(/\/delete_transaction$/, async (msg) => {
    await bot.sendMessage(msg.chat.id, 'خطأ: يجب إدخال رقم العملية بعد الأمر');
});
bot.onText(/\/delete_transaction (\d+)/, async (msg, match) => {
    const transactionId = parseInt(match![1]!);

    const userAccounts = await db.query.accounts.findMany({
        where: (account) => eq(account.userId, msg.from!.id),
    });
    if (userAccounts.length === 0) {
        await bot.sendMessage(msg.chat.id, 'خطأ: ليس لديك حسابات');
        return;
    }

    const userTransactions = await db.query.transactions.findMany({
        where: (transaction) => eq(transaction.accountId, userAccounts[0]!.id),
    });
    const transactionToDelete = userTransactions.find(transaction => transaction.id === transactionId);

    if (!transactionToDelete) {
        await bot.sendMessage(msg.chat.id, 'خطأ: العملية غير موجودة');
        return;
    }

    await db.delete(transactions).where(eq(transactions.id, transactionToDelete.id));

    await bot.sendMessage(msg.chat.id, 'تم حذف العملية بنجاح');
});
