import type { CreateOptions } from './CreateOptions';

export interface ScheduleOptions {
    cron: string;
    timezone?: string;
    createOptions?: CreateOptions;
    skipIfUnchanged?: boolean;
}

export interface ScheduleHandle {
    stop: () => void;
}
