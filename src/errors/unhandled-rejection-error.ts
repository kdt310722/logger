export class UnhandledRejectionError extends Error {
    public constructor(message?: string, options?: ErrorOptions) {
        super(message ?? 'Unhandled rejection', options)
    }
}
