import { supabase } from "@/integrations/supabase/client";
import { logger } from "./logger";

/**
 * Enterprise Job Tracker for background processes.
 * Logs execution health and success metrics to audit_log.
 */
export class JobTracker {
    public static async startJob(jobName: string, context?: any) {
        const correlationId = Math.random().toString(36).substring(2, 15);
        logger.info(`Starting background job: ${jobName}`, { correlationId, ...context });

        return {
            correlationId,
            complete: async (success: boolean, result?: any) => {
                const action = success ? 'job_success' : 'job_failure';
                await supabase.from('audit_log').insert({
                    action,
                    entity: jobName,
                    payload: {
                        correlationId,
                        duration: 'calculating...', // Optional: add duration logic
                        result,
                        ...context
                    }
                });

                if (success) {
                    logger.info(`Job ${jobName} completed successfully.`, { correlationId });
                } else {
                    logger.error(`Job ${jobName} failed.`, result, { correlationId });
                }
            }
        };
    }
}
