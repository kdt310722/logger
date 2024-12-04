import { addExitHandler } from '@kdt310722/utils/node'
import { createDeferred } from '@kdt310722/utils/promise'
import PQueue from 'p-queue'
import type { BaseLogger } from '../base-logger'
import { LOG_INPUT } from '../constants'
import { TransportError } from '../errors'
import type { LogEntry } from '../types'
import { Transport, type TransportOptions } from './transport'

export interface AsyncTransportOptions extends TransportOptions {
    maxWaitTime?: number
}

export abstract class AsyncTransport extends Transport {
    protected readonly maxWaitTime?: number
    protected readonly queue: PQueue

    public constructor(options: AsyncTransportOptions = {}) {
        super(options)

        this.maxWaitTime = options.maxWaitTime
        this.queue = new PQueue({ concurrency: 1 })
    }

    protected log(entry: LogEntry, logger: BaseLogger<any>) {
        const isCompleted = createDeferred<void>()
        const clean = addExitHandler(() => isCompleted, this.maxWaitTime)

        const onFinally = () => {
            isCompleted.resolve()
            clean()
        }

        this.queue.add(async () => this.asyncLog(entry, logger)).finally(onFinally).catch((error: unknown) => {
            logger.log(logger.fatalLevel, new TransportError({ logger, entry, transport: this }, 'Write to async transport failed:', { cause: error }), {
                [LOG_INPUT]: true,
                exclude: { transports: [this] },
            })
        })
    }

    protected abstract asyncLog(entry: LogEntry, logger: BaseLogger<any>): Promise<void>
}
