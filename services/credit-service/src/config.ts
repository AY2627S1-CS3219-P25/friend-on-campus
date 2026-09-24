/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5), date: 2026-09-24
 * Scope: Mechanically extracted the Credit Service's existing environment constants from index.ts without changing behavior.
 * Author review: <to be completed by Jiaxi>
 */
// AI-generated (edited by Jiaxi)
import dotenv from 'dotenv';

dotenv.config();

export const config = Object.freeze({
    port: process.env.PORT || 8004,
    databaseUrl:
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/credit_db',
    rabbitmqUrl:
        process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
});
