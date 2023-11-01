import { PnpmError } from '@pnpm/error'
import { prepareEmpty } from '@pnpm/prepare'
import { addDistTag } from '@pnpm/registry-mock'
import { addDependenciesToPackage, mutateModulesInSingleProject } from '@pnpm/core'
import {
  testDefaults,
} from '../utils'

test('pnpmfile version are recorded in lockfile', async () => {
  const project = prepareEmpty()

  await addDistTag({ package: '@pnpm.e2e/bar', version: '100.0.0', distTag: 'latest' })
  await addDistTag({ package: '@pnpm.e2e/foo', version: '100.0.0', distTag: 'latest' })

  const manifest = await addDependenciesToPackage({},
    ['@pnpm.e2e/pkg-with-1-dep@100.0.0', '@pnpm.e2e/foobar@100.0.0', '@pnpm.e2e/foobarqar@1.0.0'],
    await testDefaults({ pnpmfileVersion: '1' })
  )

  {
    const lockfile = await project.readLockfile()
    expect(lockfile.pnpmfileVersion).toEqual('1')
  }
  await mutateModulesInSingleProject({
    manifest,
    mutation: 'install',
    rootDir: process.cwd(),
  }, { ...await testDefaults({ pnpmfileVersion: '2' }) })

  {
    const lockfile = await project.readLockfile()
    expect(lockfile.pnpmfileVersion).toEqual('2')
  }

  await expect(
    mutateModulesInSingleProject({
      manifest,
      mutation: 'install',
      rootDir: process.cwd(),
    }, await testDefaults({ frozenLockfile: true, pnpmfileVersion: '3' }))
  ).rejects.toThrow(
    new PnpmError('LOCKFILE_CONFIG_MISMATCH',
      'Cannot proceed with the frozen installation. The current "overrides" configuration doesn\'t match the value found in the lockfile'
    )
  )
})
