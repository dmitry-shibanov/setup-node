import * as cache from '@actions/cache';
import * as core from '@actions/core';
import path from 'path';
import fs from 'fs';

import {State, Outputs} from './constants';
import {
  getCacheDirectoryPath,
  hashFile,
  isPackageManagerCacheSupported
} from './cache-utils';

export const restoreCache = async (packageManager: string, version: string) => {
  if (!isPackageManagerCacheSupported(packageManager)) {
    throw new Error(`Caching for '${packageManager}'is not supported`);
  }
  const lockKey = findLockFile(packageManager);

  const platform = process.env.RUNNER_OS;
  const fileHash = await hashFile(lockKey);

  const primaryKey = `${platform}-${packageManager}-${version}-${fileHash}`;
  core.saveState(State.CachePrimaryKey, primaryKey);

  const cachePath = await getCacheDirectoryPath(packageManager);
  const cacheKey = await cache.restoreCache([cachePath], primaryKey);

  if (!cacheKey) {
    core.warning(`${packageManager} cache is not found`);
    return;
  }

  core.saveState(State.CacheMatchedKey, cacheKey);
  const isExactMatch = (primaryKey === cacheKey).toString();
  core.setOutput(Outputs.CacheHit, isExactMatch);
  core.info(`Cache restored from key: ${cacheKey}`);
};

const findLockFile = (packageManager: string) => {
  let lockFiles = ['package-lock.json', 'yarn.lock'];
  const workspace = process.env.GITHUB_WORKSPACE!;
  const rootContent = fs.readdirSync(workspace);
  if (packageManager === 'yarn') {
    lockFiles.splice(0);
  }

  const fullLockFile = rootContent.find(item => lockFiles.includes(item));
  if (!fullLockFile) {
    throw new Error(
      `No package-lock.json or yarn.lock were found in ${workspace}`
    );
  }

  return path.resolve(fullLockFile);
};
