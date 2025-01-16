import { type InspectOptions, inspect } from 'node:util'
import { last } from '@kdt310722/utils/array'
import { chunk, ltrim } from '@kdt310722/utils/string'
import Bottleneck from 'bottleneck'
import { format } from 'date-fns'
import { isErrorLike, serializeError } from 'serialize-error'
import type { BaseLogger } from '../base-logger'
import { resolveInspectOptions } from '../prettiers'
import type { LogEntry } from '../types'
import { escapeMarkdownV2, indent } from '../utils'
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
    protected readonly token: string
    protected readonly chatId: string | number
    protected readonly dateFormat: string
    protected readonly inspectOptions: InspectOptions
    protected readonly sendOptions: Record<string, any>
    protected readonly limiter: Bottleneck

    public constructor(options: TelegramTransportOptions) {
        super(options)

        const { token, chatId, dateFormat = 'yyyy-MM-dd HH:mm:ss', inspectOptions = {}, sendOptions = {} } = options

        this.token = token
        this.chatId = chatId
        this.dateFormat = dateFormat
        this.inspectOptions = resolveInspectOptions({ ...inspectOptions, colors: false })
        this.sendOptions = sendOptions
        this.limiter = this.createLimiter()
    }

    protected async asyncLog(entry: LogEntry, logger: BaseLogger<any>) {
        const messages = this.getMessages(entry, logger)

        for (const message of messages) {
            await this.limiter.schedule(async () => this.sendMessage(message))
        }
    }

    protected async sendMessage(message: string): Promise<void> {
        const url = `https://api.telegram.org/bot${this.token}/sendMessage`

        const payload = {
            chat_id: this.chatId,
            text: message,
            parse_mode: 'MarkdownV2',
            link_preview_options: { is_disabled: true, ...this.sendOptions?.link_preview_options },
            ...this.sendOptions,
        }

        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const body = await response.json()

        if (response.status !== 200 || !body.ok) {
            throw Object.assign(new Error(`Failed to send message to Telegram`), {
                status: response.status,
                statusText: response.statusText,
                response: await response.text(),
            })
        }
    }

    protected getMessages(entry: LogEntry, logger: BaseLogger<any>) {
        let message = ''

        message += `• Level: *${escapeMarkdownV2(logger.prettier.getLevelName(entry.level).toUpperCase())}*\n`
        message += `• Time: *${escapeMarkdownV2(format(entry.timestamp, this.dateFormat))}*\n`

        if (logger.name) {
            message += `• Name: *${escapeMarkdownV2(logger.name)}*\n`
        }

        const extraMessages: string[] = []

        if (entry.message?.length) {
            const textLeft = TELEGRAM_MAX_MESSAGE_LENGTH - message.length
            const prefix = '• Message: '
            const msg = escapeMarkdownV2(entry.message)

            if (msg.length + prefix.length + 3 < textLeft) {
                message += `${prefix}*${msg}*\n`
            } else {
                extraMessages.push(`${prefix}\n`)
                extraMessages.push(...chunk(`${msg}\n`, TELEGRAM_MAX_MESSAGE_LENGTH))
            }
        }

        if (entry.context.length > 0) {
            const context: string[] = []

            for (const items of entry.context) {
                context.push(this.formatContextItem(items))
            }

            const textLeft = TELEGRAM_MAX_MESSAGE_LENGTH - message.length
            const contextMessage = escapeMarkdownV2(JSON.stringify(context, null, 2).replace(String.raw`\n`, '\n'))
            const prefix = '• Context:\n'

            if (contextMessage.length + prefix.length + 12 < textLeft) {
                message += `${prefix}\`\`\`json\n${contextMessage}\n\`\`\``
            } else {
                extraMessages.push(prefix)
                extraMessages.push(...chunk(contextMessage, TELEGRAM_MAX_MESSAGE_LENGTH - 8).map((msg) => `\`\`\`\n${msg}\n\`\`\``))
            }
        }

        if (entry.errors?.length) {
            for (const error of entry.errors) {
                const textLeft = TELEGRAM_MAX_MESSAGE_LENGTH - message.length
                const errorMsg = escapeMarkdownV2(this.formatError(error))
                const prefix = '• Error:\n'

                if (errorMsg.length + prefix.length + 12 < textLeft) {
                    message += `${prefix}\`\`\`json\n${errorMsg}\n\`\`\``
                } else {
                    extraMessages.push(prefix)
                    extraMessages.push(...chunk(errorMsg, TELEGRAM_MAX_MESSAGE_LENGTH - 8).map((msg) => `\`\`\`\n${msg}\n\`\`\``))
                }
            }
        }

        return [message, ...extraMessages]
    }

    protected formatError(error: any) {
        return JSON.stringify(serializeError(error), null, 2).replace(String.raw`\n`, '\n')
    }

    protected formatErrorValue(value: unknown) {
        if (typeof value === 'symbol' || typeof value === 'function' || typeof value === 'object') {
            return this.inspect(value, 6)
        }

        return String(value)
    }

    protected formatContextItem(item: unknown) {
        if (isErrorLike(item)) {
            return JSON.stringify(serializeError(item)).replace(String.raw`\n`, '\n')
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
