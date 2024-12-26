import { EOL } from 'node:os'
import { omit } from '@kdt310722/utils/object'
import type { BaseLogger } from '../base-logger'
import type { LogEntry } from '../types'
import { LogRotator, type LogRotatorOptions, stringify } from '../utils'
import { AsyncTransport, type AsyncTransportOptions } from './async-transport'

export type FileTransportOptions = AsyncTransportOptions & LogRotatorOptions

export class FileTransport extends AsyncTransport {
    protected readonly rotator: LogRotator

    public constructor(logDirectory: string, options: FileTransportOptions = {}) {
        super(options)

        this.rotator = new LogRotator(logDirectory, {
            ...options,
            createLogDirectoryIfNotExists: options.createLogDirectoryIfNotExists ?? this.isEnabled,
            checkLogDirectoryPermissions: options.checkLogDirectoryPermissions ?? this.isEnabled,
        })
    }

    protected async asyncLog(entry: LogEntry, logger: BaseLogger<any>) {
        await this.rotator.write(`${stringify({ level: logger.prettier.getLevelName(entry.level), ...omit(entry, 'level', 'icon', 'exclude', 'instance') })}${EOL}`)
    }
}
