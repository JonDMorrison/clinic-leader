import { supabase } from "@/integrations/supabase/client";

/**
 * Enterprise Structured Logger
 * Provides consistent logging with correlation IDs and context.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
    userId?: string;
    teamId?: string;
    correlationId?: string;
    component?: string;
    [key: string]: any;
}

class Logger {
    private static instance: Logger;
    private correlationId: string;

    private constructor() {
        this.correlationId = this.generateId();
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private generateId() {
        return Math.random().toString(36).substring(2, 15);
    }

    private formatMessage(level: LogLevel, message: string, context?: LogContext) {
        const timestamp = new Date().toISOString();
        return {
            timestamp,
            level: level.toUpperCase(),
            message,
            correlationId: context?.correlationId || this.correlationId,
            ...context,
        };
    }

    public info(message: string, context?: LogContext) {
        console.info(`[INFO] ${message}`, this.formatMessage('info', message, context));
    }

    public warn(message: string, context?: LogContext) {
        console.warn(`[WARN] ${message}`, this.formatMessage('warn', message, context));
    }

    public error(message: string, error?: any, context?: LogContext) {
        const formatted = this.formatMessage('error', message, {
            ...context,
            errorStack: error?.stack,
            errorMessage: error?.message || error
        });
        console.error(`[ERROR] ${message}`, formatted);

        // In Week 3, we would also send this to a remote service like Sentry or a custom table
        this.persistErrorToDB(formatted);
    }

    private async persistErrorToDB(log: any) {
        try {
            // In a real enterprise app, we log this to a dedicated audit/errors table
            await supabase.from('audit_log').insert({
                action: 'system_error',
                entity: log.component || 'logger',
                payload: log,
            });
        } catch (e) {
            // Silently fail to avoid infinite loops if DB is down
        }
    }
}

export const logger = Logger.getInstance();
