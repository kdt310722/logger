import type { Options as CreateLogUpdateOptions } from 'log-update'
import { createLogUpdate } from 'log-update'
import { LogLevel } from '../constants'
import type { Logger } from '../logger'
import type { LogLevelType } from '../types'

export interface LogUpdateOptions extends CreateLogUpdateOptions {
    level?: LogLevelType
}

export class LogUpdate {
    public readonly updater: ReturnType<typeof createLogUpdate>

    protected readonly level: number
    protected readonly stream: NodeJS.WritableStream

    public constructor(protected readonly logger: Logger, options: LogUpdateOptions = {}) {
        const { level = LogLevel.INFO, ...logUpdateOptions } = options

        this.level = logger.levelResolver(level)
        this.stream = logger.getStream(this.level)
        this.updater = createLogUpdate(this.stream, logUpdateOptions)
    }

    public getMessage(message?: any, ...context: any[]) {
        return this.logger.prettier.entry(this.logger['toLogEntry'](this.level, message, ...context))
    }
}
