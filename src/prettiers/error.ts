import { EOL } from 'node:os'
import { unique } from '@kdt310722/utils/array'
import { type AnyObject, filter, isEmptyObject } from '@kdt310722/utils/object'
import clean from 'clean-stack'
import mergeError from 'merge-error-cause'
import { badge, indent as indentStr, muted, text } from '../utils/print'
import { createPrettyPrintContext } from './context'

export interface PrettyPrintErrorOptions {
    indent?: number
    hideKeys?: string[]
    mergeErrorCause?: boolean
    cleanStack?: boolean
    badge?: boolean
    formatContext?: (context: AnyObject) => string
}

export function createPrettyPrintError(options: PrettyPrintErrorOptions = {}) {
    const { indent, mergeErrorCause = true, cleanStack = true, formatContext = createPrettyPrintContext({ indent }) } = options
    const hideKeys = unique([...(options.hideKeys ?? []), 'code', 'exitCode', 'name', 'message', 'stack', 'cause', 'hideKeys'])

    return function prettyPrintError(error: Error, showBadge: boolean = options.badge ?? true) {
        const err = mergeErrorCause ? mergeError(error) : error

        err.stack = (err.stack ?? '').replace(err.message, '')
        err.stack = cleanStack ? clean(err.stack) : err.stack

        const errType = `${err.name}${err['code'] ? ` (${err['code']})` : ''}`
        const errTypePrettied = showBadge ? badge(errType) : text(`[${errType}]`)

        const errStack = muted(indentStr(err.stack.split(EOL).slice(1).join(EOL), indent, true))

        const ignoreKeys = new Set([...hideKeys, ...(err['hideKeys'] ?? [])])
        const errContext = filter(err, (key) => !ignoreKeys.has(key))
        const errContextPrettied = isEmptyObject(errContext) ? '' : `${EOL}${formatContext(errContext)}`

        let subError = ''

        if (err instanceof AggregateError) {
            subError = `${EOL}${indentStr(err.errors.map((error) => prettyPrintError(error, true)).join(EOL), indent)}`
        }

        return `${errTypePrettied} ${text(err.message)}${EOL}${errStack}${errContextPrettied}${subError}`
    }
}
