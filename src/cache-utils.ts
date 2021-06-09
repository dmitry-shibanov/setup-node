import * as exec from '@actions/exec';
import * as core from '@actions/core';

type SupportedPackageManager = {
  [prop: string]: PackageInfo;
};

export interface PackageInfo {
  lockFilePatterns: Array<string>;
  getCacheFolderCommand: string;
}

export const supportedPackageManagers: SupportedPackageManager = {
  npm: {
    lockFilePatterns: ['package-lock.json', 'yarn.lock'],
    getCacheFolderCommand: 'npm config get cache'
  },
  yarn1: {
    lockFilePatterns: ['yarn.lock'],
    getCacheFolderCommand: 'yarn cache dir'
  },
  yarn2: {
    lockFilePatterns: ['yarn.lock'],
    getCacheFolderCommand: 'yarn config get cacheFolder'
  }
};

export const getCommandOutput = async (toolCommand: string) => {
  const {stdout, stderr, exitCode} = await exec.getExecOutput(toolCommand);

  if (stderr) {
    throw new Error(stderr);
  }

  return stdout;
};

const getpackageManagerVersion = async (
  packageManager: string,
  command: string
) => {
  const stdOut = await getCommandOutput(`${packageManager} ${command}`);

  if (!stdOut) {
    throw new Error(`Could not retrieve version of ${packageManager}`);
  }

  return stdOut;
};

export const getPackageManagerInfo = async (packageManager: string) => {
  if (packageManager === 'npm') {
    return supportedPackageManagers.npm;
  } else if (packageManager === 'yarn') {
    const yarnVersion = await getpackageManagerVersion('yarn', '--version');

    core.debug(`consumed yarn version is ${yarnVersion}`);

    if (yarnVersion.startsWith('1.')) {
      return supportedPackageManagers.yarn1;
    } else {
      return supportedPackageManagers.yarn2;
    }
  } else {
    return null;
  }
};

export const getCacheDirectoryPath = async (
  packageManagerInfo: PackageInfo,
  packageManager: string
) => {
  const stdOut = await getCommandOutput(
    packageManagerInfo.getCacheFolderCommand
  );

  if (!stdOut) {
    throw new Error(`Could not get cache folder path for ${packageManager}`);
  }

  core.debug(`${packageManager} path is ${stdOut}`);

  return stdOut;
};
