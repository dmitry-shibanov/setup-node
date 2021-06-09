import * as core from '@actions/core';
import path from 'path';
import * as utils from '../src/cache-utils';

describe('cache-utils', () => {
  const commonPath = '/some/random/path';
  const versionYarn1 = '1.2.3';
  const versionYarn2 = '2.3.4';

  let debugSpy: jest.SpyInstance;
  let getCommandOutputSpy: jest.SpyInstance;

  function getPackagePath(name: string) {
    if (name === utils.supportedPackageManagers.npm.getCacheFolderCommand) {
      return `${commonPath}/npm`;
    } else {
      if (name === utils.supportedPackageManagers.yarn1.getCacheFolderCommand) {
        return `${commonPath}/yarn1`;
      } else {
        return `${commonPath}/yarn2`;
      }
    }
  }

  beforeEach(() => {
    process.env['GITHUB_WORKSPACE'] = path.join(__dirname, 'data');
    debugSpy = jest.spyOn(core, 'debug');
    debugSpy.mockImplementation(msg => {});

    getCommandOutputSpy = jest.spyOn(utils, 'getCommandOutput');
  });

  describe('getPackageManagerInfo', () => {
    it.each([
      ['npm', utils.supportedPackageManagers.npm],
      ['yarn', utils.supportedPackageManagers.yarn1],
      ['yarn1', null],
      ['yarn2', null],
      ['npm7', null]
    ])('getPackageManagerInfo for %s is %o', async (packageManager, result) => {
      getCommandOutputSpy.mockImplementationOnce(() => versionYarn1);
      await expect(utils.getPackageManagerInfo(packageManager)).resolves.toBe(
        result
      );
    });
  });

  describe('getCacheDirectoryPath', () => {
    it('getCacheDirectoryPath for npm', async () => {
      getCommandOutputSpy.mockImplementationOnce(getPackagePath);
      const packageManagerInfo = (await utils.getPackageManagerInfo(
        'npm'
      )) as utils.PackageManagerInfo;
      await expect(
        utils.getCacheDirectoryPath(packageManagerInfo, 'npm')
      ).resolves.toBe(`${commonPath}/npm`);
    });

    it('getCacheDirectoryPath for yarn 2', async () => {
      getCommandOutputSpy
        .mockImplementationOnce(() => versionYarn2)
        .mockImplementationOnce(getPackagePath);
      const packageManagerInfo = (await utils.getPackageManagerInfo(
        'yarn'
      )) as utils.PackageManagerInfo;
      await expect(
        utils.getCacheDirectoryPath(packageManagerInfo, 'yarn')
      ).resolves.toBe(`${commonPath}/yarn2`);
    });

    it('getCacheDirectoryPath for yarn 1', async () => {
      getCommandOutputSpy
        .mockImplementationOnce(() => versionYarn1)
        .mockImplementationOnce(getPackagePath);
      const packageManagerInfo = (await utils.getPackageManagerInfo(
        'yarn'
      )) as utils.PackageManagerInfo;
      await expect(
        utils.getCacheDirectoryPath(packageManagerInfo, 'yarn')
      ).resolves.toBe(`${commonPath}/yarn1`);
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    //jest.restoreAllMocks();
  });
});
