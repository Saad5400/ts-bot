import {text, integer, sqliteTable} from "drizzle-orm/sqlite-core";
import {relations} from "drizzle-orm";

export enum TaskStatus {
    Pending = 'pending',
    Completed = 'completed',
    Cancelled = 'cancelled',
}

export const tasks = sqliteTable('tasks', {
    id: integer('id').primaryKey({autoIncrement: true}),
    chatId: integer('chatId').notNull(),
    title: text('title').notNull(),
    status: text('status', {
        enum: [TaskStatus.Pending, TaskStatus.Completed, TaskStatus.Cancelled],
    }).notNull().default(TaskStatus.Pending),
});
