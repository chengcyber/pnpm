import { Config } from '@pnpm/config'
import defaultReporter from '@pnpm/default-reporter'
import { LogLevel, streamParser, writeToConsole } from '@pnpm/logger'
import { requireHooks } from '@pnpm/pnpmfile'
import type { Log } from '@pnpm/core-loggers';
import silentReporter from './silentReporter'

export type ReporterType = 'default' | 'ndjson' | 'silent' | 'append-only'

export default (
  reporterType: ReporterType,
  opts: {
    cmd: string | null
    config: Config
  }
) => {
  switch (reporterType) {
  case 'default':
    defaultReporter({
      useStderr: opts.config.useStderr,
      context: {
        argv: opts.cmd ? [opts.cmd] : [],
        config: opts.config,
      },
      reportingOptions: {
        appendOnly: false,
        logLevel: opts.config.loglevel as LogLevel,
        streamLifecycleOutput: opts.config.stream,
        throttleProgress: 200,
        filterLog: getFilterLog(opts.config),
      },
      streamParser,
    })
    return
  case 'append-only':
    defaultReporter({
      useStderr: opts.config.useStderr,
      context: {
        argv: opts.cmd ? [opts.cmd] : [],
        config: opts.config,
      },
      reportingOptions: {
        appendOnly: true,
        logLevel: opts.config.loglevel as LogLevel,
        throttleProgress: 1000,
        filterLog: getFilterLog(opts.config),
      },
      streamParser,
    })
    return
  case 'ndjson':
    writeToConsole()
    return
  case 'silent':
    silentReporter(streamParser)
  }
}


function getFilterLog(config: Config): ((log: Log) => boolean) | undefined {
  let filterLog: undefined | ((log: Log) => boolean) = undefined
  if (config) {
    const pnpmOpts = config;
    const { ignorePnpmfile, lockfileDir, dir, } = pnpmOpts
    if (!ignorePnpmfile) {
      const hooks = requireHooks(lockfileDir ?? dir, pnpmOpts)
      if (hooks.filterLog) {
        filterLog = hooks.filterLog
      }
    }
  }
  return filterLog;
}