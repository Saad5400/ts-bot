import {text, integer, sqliteTable} from "drizzle-orm/sqlite-core";
import {relations} from "drizzle-orm";

export const accounts = sqliteTable('accounts', {
    id: integer('id').primaryKey({autoIncrement: true}),
    userId: integer('user').notNull(),
    name: text('name').notNull(),
});

export const accountsRelations = relations(accounts, ({one, many}) => ({
    transactions: many(transactions),
}))

export const transactions = sqliteTable('transactions', {
    id: integer('id').primaryKey({autoIncrement: true}),
    accountId: integer('account').notNull().references(() => accounts.id, {
        onDelete: "cascade",
    }),
    amount: integer('amount').notNull(),
    description: text('description'),
    category: text('category').notNull(),
    date: text('date').notNull(),
});

export const transactionsRelations = relations(transactions, ({one, many}) => ({
    account: one(accounts, {
        fields: [transactions.accountId],
        references: [accounts.id],
    }),
}))
