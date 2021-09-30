/* eslint-disable  @typescript-eslint/no-explicit-any */
import path from 'path'
import { hookLogger } from '@pnpm/core-loggers'
import logger from '@pnpm/logger'
import pathAbsolute from 'path-absolute'
import type { Lockfile } from '@pnpm/lockfile-types'
import type { Log } from '@pnpm/core-loggers'
import requirePnpmfile from './requirePnpmfile'

interface HookContext {
  log: (message: string) => void
}

interface Hooks {
  // FIXME: use any since ReadPackageHook contains function override :(
  readPackage?: (pkg: any, context: HookContext) => any
  afterAllResolved?: (lockfile: Lockfile, context: HookContext) => Lockfile
  filterLog?: (log: Log) => boolean
}

type Cook<T extends (...args: any[]) => any> = (
  arg: Parameters<T>[0],
  ...otherArgs: any[]
) => ReturnType<T>

interface CookedHooks {
  readPackage?: Cook<Required<Hooks>['readPackage']>
  afterAllResolved?: Cook<Required<Hooks>['afterAllResolved']>
  filterLog?: Cook<Required<Hooks>['filterLog']>
}

export default function requireHooks (
  prefix: string,
  opts: {
    globalPnpmfile?: string
    pnpmfile?: string
  }
): CookedHooks {
  const globalPnpmfile = opts.globalPnpmfile && requirePnpmfile(pathAbsolute(opts.globalPnpmfile, prefix), prefix)
  let globalHooks: Hooks = globalPnpmfile?.hooks

  const pnpmFile = opts.pnpmfile && requirePnpmfile(pathAbsolute(opts.pnpmfile, prefix), prefix) ||
    requirePnpmfile(path.join(prefix, '.pnpmfile.cjs'), prefix)
  let hooks: Hooks = pnpmFile?.hooks

  if (!globalHooks && !hooks) return {}
  globalHooks = globalHooks || {}
  hooks = hooks || {}
  const cookedHooks = {}
  if ((globalHooks.readPackage != null) || (hooks.readPackage != null)) {
    logger.info({
      message: 'readPackage hook is declared. Manifests of dependencies might get overridden',
      prefix,
    })
  }
  const hookNames = ['readPackage', 'afterAllResolved', 'filterLog'] as const
  for (const hookName of hookNames) {
    const globalHook = globalHooks[hookName]
    const hook = hooks[hookName]
    if ((globalHook != null) && (hook != null)) {
      const globalHookContext = createHookContext(globalPnpmfile.filename, prefix, hookName)
      const localHookContext = createHookContext(pnpmFile.filename, prefix, hookName)
      // the `arg` is a package manifest in case of readPackage() and a lockfile object in case of afterAllResolved()
      cookedHooks[hookName] = (arg: any) => {
        return hook(
          globalHook(arg, globalHookContext),
          localHookContext
        )
      }
    } else if (globalHook != null) {
      const context = createHookContext(globalPnpmfile.filename, prefix, hookName)
      cookedHooks[hookName] = (pkg: any) => globalHook(pkg, context)
    } else if (hook != null) {
      const context = createHookContext(pnpmFile.filename, prefix, hookName)
      cookedHooks[hookName] = (pkg: any) => hook(pkg, context)
    }
  }
  return cookedHooks
}

function createHookContext (calledFrom: string, prefix: string, hook: string): HookContext {
  return {
    log: (message: string) => hookLogger.debug({
      from: calledFrom,
      hook,
      message,
      prefix,
    }),
  }
}
