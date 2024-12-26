import { createWriteStream, existsSync, lstatSync, mkdirSync } from 'node:fs'
import { join, parse } from 'node:path'
import { isDirectory, isWritable } from '@kdt310722/utils/node'
import { createDeferred } from '@kdt310722/utils/promise'
import bytes from 'bytes'
import { type ContextOptions, type Day, differenceInDays, differenceInHours, differenceInMinutes, differenceInMonths, differenceInWeeks, differenceInYears, format, isMatch, startOfDay, startOfHour, startOfMinute, startOfMonth, startOfWeek, startOfYear } from 'date-fns'
import fg from 'fast-glob'

export enum LogRotatorFrequency {
    MINUTELY = 'minutely',
    HOURLY = 'hourly',
    DAILY = 'daily',
    WEEKLY = 'weekly',
    MONTHLY = 'monthly',
    YEARLY = 'yearly',
}

export type StartOfFrequencyFn = (date: Date, options?: ContextOptions<Date> & { weekStartsOn?: Day }) => Date

export const START_OF_FREQUENCY: Record<LogRotatorFrequency, StartOfFrequencyFn> = {
    [LogRotatorFrequency.MINUTELY]: startOfMinute,
    [LogRotatorFrequency.HOURLY]: startOfHour,
    [LogRotatorFrequency.DAILY]: startOfDay,
    [LogRotatorFrequency.WEEKLY]: startOfWeek,
    [LogRotatorFrequency.MONTHLY]: startOfMonth,
    [LogRotatorFrequency.YEARLY]: startOfYear,
}

export const DIFF_BY_FREQUENCY: Record<LogRotatorFrequency, (left: Date, right: Date) => number> = {
    [LogRotatorFrequency.MINUTELY]: differenceInMinutes,
    [LogRotatorFrequency.HOURLY]: differenceInHours,
    [LogRotatorFrequency.DAILY]: differenceInDays,
    [LogRotatorFrequency.WEEKLY]: differenceInWeeks,
    [LogRotatorFrequency.MONTHLY]: differenceInMonths,
    [LogRotatorFrequency.YEARLY]: differenceInYears,
}

export interface LogRotatorOptions {
    createLogDirectoryIfNotExists?: boolean
    checkLogDirectoryPermissions?: boolean
    frequency?: LogRotatorFrequency
    dateFormat?: string
    maxSize?: string
    weekStartsOn?: Day
    extension?: string
}

export class LogRotator {
    protected readonly output: string
    protected readonly frequency: LogRotatorFrequency
    protected readonly dateFormat: string
    protected readonly maxSize?: number
    protected readonly weekStartsOn: Day
    protected readonly extension: string

    protected index: number
    protected modifiedAt?: Date
    protected logPath?: string
    protected writeStream?: NodeJS.WritableStream

    public constructor(output: string, options: LogRotatorOptions = {}) {
        this.output = this.getOutputDirectory(output, options.createLogDirectoryIfNotExists, options.checkLogDirectoryPermissions)
        this.frequency = options.frequency ?? LogRotatorFrequency.DAILY
        this.dateFormat = options.dateFormat ?? 'yyyy-MM-dd'
        this.maxSize = options.maxSize ? (bytes.parse(options.maxSize) ?? undefined) : undefined
        this.weekStartsOn = options.weekStartsOn ?? 1
        this.extension = options.extension ?? 'log'

        const { index, modifiedDate } = this.getLatestLogFile() ?? {}

        this.index = index ?? 0
        this.modifiedAt = modifiedDate ? START_OF_FREQUENCY[this.frequency](new Date(modifiedDate)) : undefined
    }

    public async write(message: string) {
        const isWrote = createDeferred<void>()

        this.getWriteStream().write(message, 'utf8', (error) => {
            if (error) {
                isWrote.reject(error)
            } else {
                isWrote.resolve()
            }
        })

        return isWrote.then(() => {
            this.modifiedAt = START_OF_FREQUENCY[this.frequency](new Date())
        })
    }

    protected getWriteStream() {
        const path = this.getLogPath()

        if (!this.writeStream || this.logPath !== path) {
            this.writeStream = createWriteStream(path, { encoding: 'utf8', flags: 'a' })
        }

        return this.writeStream
    }

    protected getLogPath() {
        const date = START_OF_FREQUENCY[this.frequency](new Date(), { weekStartsOn: this.weekStartsOn })
        const filename = format(date, this.dateFormat, { weekStartsOn: this.weekStartsOn })

        while (this.shouldRotate(this.getLogOutput(filename), date)) {
            this.index++
        }

        return this.getLogOutput(filename)
    }

    protected getLogOutput(filename: string) {
        return join(this.output, `${filename}${this.index > 0 ? `_${this.index}` : ''}.${this.extension}`)
    }

    protected shouldRotate(path: string, date: Date) {
        if (!existsSync(path)) {
            return false
        }

        if (this.maxSize && lstatSync(path).size >= this.maxSize) {
            return true
        }

        return this.shouldRotateByDate(date)
    }

    protected shouldRotateByDate(date: Date) {
        return this.modifiedAt && Math.abs(DIFF_BY_FREQUENCY[this.frequency](this.modifiedAt, date)) > 0
    }

    protected getLatestLogFile() {
        const files = fg.sync(this.getGlobPattern(), { onlyFiles: true, deep: 0 }).map((i) => this.parseLogPath(i))

        if (files.length === 0) {
            return
        }

        const filteredFiles = files.filter(({ filename }) => isMatch(filename, this.dateFormat, { weekStartsOn: this.weekStartsOn }))
        const sortedFiles = filteredFiles.toSorted((a, b) => b.modifiedDate - a.modifiedDate)

        return sortedFiles[0]
    }

    protected parseLogPath(path: string) {
        const parts = parse(path).name.split('_')
        const modifiedDate = Math.round(lstatSync(path).mtimeMs)

        if (parts.length < 2) {
            return { filename: parts.join('_'), index: 0, modifiedDate, path }
        }

        const filename = parts.slice(0, -1).join('_')
        const index = Number(parts.at(-1) ?? 0)

        return { filename, index, modifiedDate, path }
    }

    protected getGlobPattern() {
        return join(this.output, `*.${this.extension}`)
    }

    protected getOutputDirectory(path: string, createIfNotExists = true, checkPermissions = true) {
        if (createIfNotExists && !existsSync(path)) {
            mkdirSync(path, { recursive: true })
        }

        if (checkPermissions && (!isDirectory(path) || !isWritable(path))) {
            throw new Error(`${path} is not a valid directory`)
        }

        return path
    }
}
