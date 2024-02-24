import { unique } from '@kdt310722/utils/array'
import type { LogEntry } from '../types'

export function mergeEntry(base: LogEntry, item: Partial<LogEntry>): LogEntry {
    return {
        ...base,
        ...item,
        context: [...base.context, ...(item?.context ?? [])],
        errors: [...base.errors, ...(item?.errors ?? [])],
        metadata: { ...base.metadata, ...item.metadata },
        exclude: {
            transformers: unique([...(base.exclude?.transformers ?? []), ...(item.exclude?.transformers ?? [])]),
            transports: unique([...(base.exclude?.transports ?? []), ...(item.exclude?.transports ?? [])]),
        },
    }
}
