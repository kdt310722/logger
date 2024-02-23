import { blue, gray, green, red, yellow } from 'colorette'

export enum LogLevel {
    TRACE = 10,
    DEBUG = 20,
    INFO = 30,
    WARN = 40,
    ERROR = 50,
    FATAL = 60,
}

export const LOG_LEVEL_NAMES = <const>{
    [LogLevel.TRACE]: 'trace',
    [LogLevel.DEBUG]: 'debug',
    [LogLevel.INFO]: 'info',
    [LogLevel.WARN]: 'warn',
    [LogLevel.ERROR]: 'error',
    [LogLevel.FATAL]: 'fatal',
}

export const LOG_LEVEL_COLORS = <const>{
    [LogLevel.TRACE]: gray,
    [LogLevel.DEBUG]: green,
    [LogLevel.INFO]: blue,
    [LogLevel.WARN]: yellow,
    [LogLevel.ERROR]: red,
    [LogLevel.FATAL]: red,
}

export const LOG_INPUT = Symbol('logger.log-input')
export const LOG_LAZY_MESSAGE = Symbol('logger.lazy-message')
export const LOG_LAZY_CONTEXT = Symbol('logger.lazy-context')
