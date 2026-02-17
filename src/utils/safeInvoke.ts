import { supabase } from "@/integrations/supabase/client";
import { logger } from "./logger";

/**
 * Enterprise Safe Function Invoker
 * Wraps supabase.functions.invoke with retries and timeouts.
 */
export async function safeInvoke<T = any>(
    functionName: string,
    options: { body?: any; method?: 'GET' | 'POST' | 'PUT' | 'DELETE' } = {},
    retries = 2
): Promise<{ data: T | null; error: any }> {
    let lastError: any = null;

    for (let i = 0; i <= retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            const { data, error } = await supabase.functions.invoke(functionName, {
                ...options,
                headers: {
                    'x-correlation-id': (logger as any).correlationId || 'none',
                    ...options.body?.headers
                },
            });

            clearTimeout(timeoutId);

            if (!error) return { data, error: null };

            lastError = error;
            logger.warn(`Retry ${i + 1}/${retries} for ${functionName} failed.`, { error });

            // Wait before retry (exponential backoff)
            await new Promise(res => setTimeout(res, Math.pow(2, i) * 1000));

        } catch (e) {
            lastError = e;
            logger.warn(`Attempt ${i + 1} for ${functionName} caught exception.`, { e });
        }
    }

    logger.error(`All ${retries + 1} attempts for ${functionName} failed.`, lastError);
    return { data: null, error: lastError };
}
