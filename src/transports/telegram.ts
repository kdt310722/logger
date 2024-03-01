import { type InspectOptions, inspect } from 'node:util'
import { last } from '@kdt310722/utils/array'
import { chunk, ltrim } from '@kdt310722/utils/string'
import Bottleneck from 'bottleneck'
import { format } from 'date-fns'
import { isErrorLike, serializeError } from 'serialize-error'
import { Telegraf } from 'telegraf'
import { FmtString, bold, fmt, join, pre } from 'telegraf/format'
import type { BaseLogger } from '../base-logger'
import { resolveInspectOptions } from '../prettiers'
import type { LogEntry } from '../types'
import { indent } from '../utils'
import { AsyncTransport, type AsyncTransportOptions } from './async-transport'

export interface TelegramTransportOptions extends AsyncTransportOptions {
    token: string
    chatId: string | number
    dateFormat?: string
    inspectOptions?: Omit<InspectOptions, 'colors'>
    sendOptions?: Record<string, any>
}

export const TELEGRAM_MAX_MESSAGE_LENGTH = 4096

export const TELEGRAM_MAX_MESSAGES_PER_SECOND = 30

export const TELEGRAM_MAX_MESSAGES_PER_MINUTE_PER_CHAT = 20

export class TelegramTransport extends AsyncTransport {
    protected readonly chatId: string | number
    protected readonly dateFormat: string
    protected readonly inspectOptions: InspectOptions
    protected readonly sendOptions: Record<string, any>
    protected readonly limiter: Bottleneck
    protected readonly sender: Telegraf

    public constructor(options: TelegramTransportOptions) {
        super(options)

        const { token, chatId, dateFormat = 'yyyy-MM-dd HH:mm:ss', inspectOptions = {}, sendOptions = {} } = options

        this.chatId = chatId
        this.dateFormat = dateFormat
        this.inspectOptions = resolveInspectOptions({ ...inspectOptions, colors: false })
        this.sendOptions = sendOptions
        this.limiter = this.createLimiter()
        this.sender = new Telegraf(token)
    }

    protected async asyncLog(entry: LogEntry, logger: BaseLogger<any>) {
        const messages = this.chunkMessage(this.getMessage(entry, logger))

        for (const message of messages) {
            await this.limiter.schedule(async () => this.sendMessage(message))
        }
    }

    protected async sendMessage(message: FmtString): Promise<void> {
        await this.sender.telegram.sendMessage(this.chatId, message, {
            ...this.sendOptions,
            link_preview_options: {
                is_disabled: this.sendOptions?.link_preview_options?.is_disabled ?? true,
                ...this.sendOptions?.link_preview_options,
            },
        })
    }

    protected chunkMessage(message: FmtString) {
        if (!message.entities) {
            return [message]
        }

        const messages: FmtString[] = []
        const overflow = message.entities.findIndex((e) => e.offset + e.length > TELEGRAM_MAX_MESSAGE_LENGTH)

        if (overflow === -1) {
            return [message]
        }

        const offset = message.entities[overflow].offset
        const entities = message.entities.splice(0, overflow)
        const newEntities = message.entities.map((e) => ({ ...e, offset: e.offset - offset }))

        messages.push(new FmtString(message.text.slice(0, offset), entities))
        messages.push(...this.chunkMessage(new FmtString(message.text.slice(offset), newEntities)))

        return messages
    }

    protected getMessage(entry: LogEntry, logger: BaseLogger<any>) {
        const message = [
            this.formatMessage('• Level: ', logger.prettier.getLevelName(entry.level).toUpperCase()),
            this.formatMessage('• Time: ', format(entry.timestamp, this.dateFormat)),
        ]

        if (logger.name) {
            message.push(this.formatMessage('• Name: ', logger.name))
        }

        if (entry.message?.length) {
            message.push(this.formatMessage('• Message: ', entry.message))
        }

        if (entry.context.length > 0) {
            const context: string[] = []

            for (const items of entry.context) {
                context.push(this.formatContextItem(items))
            }

            message.push(this.formatMessage('• Context:\n', JSON.stringify(context, null, 2), pre('json')))
        }

        if (entry.errors?.length) {
            for (const error of entry.errors) {
                message.push(this.formatMessage('• Error:\n', this.formatError(error), pre('json')))
            }
        }

        return join(message, '\n')
    }

    protected formatMessage(key: string, message: string, formatter: (message: string) => FmtString = bold) {
        const length = key.length + message.length
        const limit = TELEGRAM_MAX_MESSAGE_LENGTH

        if (length > limit) {
            return fmt(key, join(chunk(message, limit - key.length).map((m) => this.formatMessage('', m, formatter))))
        }

        return fmt(key, formatter(message))
    }

    protected formatError(error: any) {
        return JSON.stringify(serializeError(error), null, 2)
    }

    protected formatErrorValue(value: unknown) {
        if (typeof value === 'symbol' || typeof value === 'function' || typeof value === 'object') {
            return this.inspect(value, 6)
        }

        return String(value)
    }

    protected formatContextItem(item: unknown) {
        if (isErrorLike(item)) {
            return JSON.stringify(serializeError(item))
        }

        return this.inspect(item, 4)
    }

    protected inspect(param: unknown, indentSpace: number) {
        return this.trimLastLineSpace(ltrim(indent(inspect(param, this.inspectOptions), indentSpace)), indentSpace - 2)
    }

    protected trimLastLineSpace(message: string, space: number) {
        const lines = message.split('\n')

        if (lines.length > 1) {
            lines[lines.length - 1] = ' '.repeat(space) + ltrim(last(lines))
        }

        return lines.join('\n')
    }

    protected createLimiter() {
        const reservoir = TELEGRAM_MAX_MESSAGES_PER_MINUTE_PER_CHAT
        const minTime = 1000 / TELEGRAM_MAX_MESSAGES_PER_SECOND

        return new Bottleneck({
            reservoir,
            reservoirRefreshAmount: reservoir,
            reservoirRefreshInterval: 60 * 1000,
            minTime,
            maxConcurrent: 1,
        })
    }
}
