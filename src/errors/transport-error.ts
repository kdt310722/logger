import type { BaseLogger } from '../base-logger'
import type { Transport } from '../transports'
import type { LogEntry } from '../types'

export interface TransportErrorContext {
    logger: BaseLogger<any>
    transport: Transport
    entry: LogEntry
}

export class TransportError extends Error {
    public readonly logger: BaseLogger<any>
    public readonly transport: Transport
    public readonly entry: LogEntry
    public readonly hideKeys: string[] = ['logger', 'transport']

    public constructor(context: TransportErrorContext, message?: string, options?: ErrorOptions) {
        super(message ?? 'Transport error', options)

        this.logger = context.logger
        this.transport = context.transport
        this.entry = context.entry
    }
}
