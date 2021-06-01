import * as cache from '@actions/cache';
import * as core from '@actions/core';
import path from 'path';
import fs from 'fs';

import {State, Outputs} from './constants';
import {
  getCacheDirectoryPath,
  hashFile,
  isPackageManagerCacheSupported,
  supportedPackageManagers
} from './cache-utils';

export const restoreCache = async (packageManager: string) => {
  if (!isPackageManagerCacheSupported(packageManager)) {
    throw new Error(`Caching for '${packageManager}'is not supported`);
  }
  const platform = process.env.RUNNER_OS;
  const lockFilePath = findLockFile(packageManager);

  const fileHash = await hashFile(lockFilePath);
  const primaryKey = `${platform}-${packageManager}-${fileHash}`;
  core.saveState(State.CachePrimaryKey, primaryKey);

  const cachePath = await getCacheDirectoryPath(packageManager);
  const cacheKey = await cache.restoreCache([cachePath], primaryKey);

  if (!cacheKey) {
    core.info(`${packageManager} cache is not found`);
    return;
  }

  core.saveState(State.CacheMatchedKey, cacheKey);
  const isExactMatch = (primaryKey === cacheKey).toString();
  core.setOutput(Outputs.CacheHit, isExactMatch);
  core.info(`Cache restored from key: ${cacheKey}`);
};

const findLockFile = (packageManager: string) => {
  let lockFiles;
  if (packageManager === 'npm') {
    lockFiles = supportedPackageManagers.npm.lockFilePatterns;
  } else {
    lockFiles = supportedPackageManagers.yarn1.lockFilePatterns;
  }
  const workspace = process.env.GITHUB_WORKSPACE!;
  const rootContent = fs.readdirSync(workspace);

  const fullLockFile = rootContent.find(item => lockFiles.includes(item));
  if (!fullLockFile) {
    throw new Error(
      `No package-lock.json or yarn.lock were found in ${workspace}`
    );
  }

  return path.resolve(fullLockFile);
};
