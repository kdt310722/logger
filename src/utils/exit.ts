import { EOL } from 'node:os'
import { tap } from '@kdt310722/utils/function'
import { gracefulExit, isExiting } from '@kdt310722/utils/node'
import type { Logger } from '../logger'

export type { ExitHandler } from '@kdt310722/utils/node'

export { addExitHandler, isExiting, gracefulExit } from '@kdt310722/utils/node'

let ctrlCCount = 0

export function incrementCtrlCCount() {
    ctrlCCount++
}

export function exit(logger: Logger, exitCode?: number, maxWaitTime?: number, isCtrlC = false) {
    if (isCtrlC) {
        incrementCtrlCCount()
    }

    if (ctrlCCount > 2) {
        process.exit()
    }

    if (isExiting()) {
        process.stdout.write(EOL)

        if (isCtrlC) {
            return logger.warn('Application is currently shutting down, to force exit, press Ctrl+C again')
        }

        return
    }

    tap(process.stdout.write(EOL), () => {
        logger.info('Shutting down...')
    })

    return gracefulExit(exitCode, maxWaitTime)
}
