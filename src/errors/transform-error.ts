import type { BaseLogger } from '../base-logger'
import type { LogEntry, LogTransformer } from '../types'

export interface TransformErrorContext {
    logger: BaseLogger<any>
    transformer: LogTransformer
    entry: LogEntry
}

export class TransformError extends Error {
    public readonly logger: BaseLogger<any>
    public readonly transformer: LogTransformer
    public readonly entry: LogEntry
    public readonly hideKeys: string[] = ['logger', 'transformer']

    public constructor(context: TransformErrorContext, message?: string, options?: ErrorOptions) {
        super(message ?? 'Transform error', options)

        this.logger = context.logger
        this.transformer = context.transformer
        this.entry = context.entry
    }
}
