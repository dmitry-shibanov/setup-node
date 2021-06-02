import * as exec from '@actions/exec';
import {LockType} from './constants';
import * as glob from '@actions/glob';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as stream from 'stream';
import * as util from 'util';
import * as path from 'path';

type SupportedPackageManagers = {
  [prop: string]: SupportedPackageInfo;
};

export interface SupportedPackageInfo {
  lockFilePatterns: Array<string>;
  getCacheFolderCommand: string;
}

export const supportedPackageManagers: SupportedPackageManagers = {
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

const getCommandOutput = async (toolCommand: string) => {
  let stdOut: string | undefined;
  let stdErr: string | undefined;

  await exec.exec(toolCommand, undefined, {
    listeners: {
      stderr: (err: Buffer) => (stdErr = err.toString()),
      stdout: (out: Buffer) => (stdOut = out.toString())
    }
  });

  if (stdErr) {
    throw new Error(stdErr);
  }

  return stdOut;
};

const getpackageManagerVersion = async (
  packageManager: string,
  command: string
) => {
  const stdOut = await getCommandOutput(`${packageManager} ${command}`);

  if (!stdOut) {
    throw new Error(`Could not get version for ${packageManager}`);
  }

  if (stdOut.startsWith('1.')) {
    return '1';
  }

  return '2';
};

export const isPackageManagerCacheSupported = packageManager => {
  const arr = Array.of<string>(...Object.values(LockType));
  return arr.includes(packageManager);
};

export const getCacheDirectoryPath = async (packageManager: string) => {
  let packageManagerInfo;
  if (packageManager === 'npm') {
    packageManagerInfo = supportedPackageManagers.npm;
  } else if (packageManager === 'yarn') {
    const yarnVersion = await getpackageManagerVersion('yarn', '--version');
    if (yarnVersion.startsWith('1.')) {
      packageManagerInfo = supportedPackageManagers.yarn1;
    } else {
      packageManagerInfo = supportedPackageManagers.yarn2;
    }
  }
  const stdOut = await getCommandOutput(
    packageManagerInfo.getCacheFolderCommand
  );

  if (!stdOut) {
    throw new Error(`Could not get cache folder path for ${packageManager}`);
  }

  return {supportedPackageManager: packageManagerInfo, cachePath: stdOut};
};

// https://github.com/actions/runner/blob/master/src/Misc/expressionFunc/hashFiles/src/hashFiles.ts
// replace it, when the issue will be resolved: https://github.com/actions/toolkit/issues/472
export async function hashFile(matchPatterns: string): Promise<string> {
  let hasMatch = false;
  let followSymbolicLinks = false;
  if (process.env.followSymbolicLinks === 'true') {
    followSymbolicLinks = true;
  }
  const githubWorkspace = process.env.GITHUB_WORKSPACE;
  const result = crypto.createHash('sha256');
  const globber = await glob.create(matchPatterns, {followSymbolicLinks});
  for await (const file of globber.globGenerator()) {
    if (!file.startsWith(`${githubWorkspace}${path.sep}`)) {
      continue;
    }
    if (fs.statSync(file).isDirectory()) {
      continue;
    }
    const hash = crypto.createHash('sha256');
    const pipeline = util.promisify(stream.pipeline);
    await pipeline(fs.createReadStream(file), hash);
    result.write(hash.digest());
    if (!hasMatch) {
      hasMatch = true;
    }
  }
  result.end();

  return result.digest('hex');
}
