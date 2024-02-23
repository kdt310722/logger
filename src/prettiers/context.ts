import { type InspectOptions, formatWithOptions } from 'node:util'
import { indent } from '../utils'

export const resolveInspectOptions = (options: InspectOptions = {}): InspectOptions => {
    const { depth = Number.POSITIVE_INFINITY, colors = true } = options
    const { maxArrayLength = Number.POSITIVE_INFINITY, maxStringLength = Number.POSITIVE_INFINITY } = options
    const breakLength = options.breakLength ?? Math.max(80, process.stdout.columns)

    return { depth, colors, maxArrayLength, maxStringLength, breakLength, ...options }
}

export interface PrettyPrintContextOptions extends InspectOptions {
    indent?: number
}

export const createPrettyPrintContext = (options: PrettyPrintContextOptions = {}) => {
    const { indent: indentLength, ...rest } = options
    const inspectOptions = resolveInspectOptions(rest)

    return (...context: any[]) => indent(formatWithOptions(inspectOptions, ...context), indentLength)
}
