import * as cache from '@actions/cache';
import * as core from '@actions/core';
import path from 'path';
import fs from 'fs';

import {State, Outputs} from './constants';
import {
  getCacheDirectoryPath,
  hashFile,
  getPackageManagerInfo,
  PackageManagerInfo
} from './cache-utils';

export const restoreCache = async (packageManager: string) => {
  const packageManagerInfo = await getPackageManagerInfo(packageManager);
  if (!packageManagerInfo) {
    throw new Error(`Caching for '${packageManager}' is not supported`);
  }
  const platform = process.env.RUNNER_OS;

  const cachePath = await getCacheDirectoryPath(
    packageManagerInfo,
    packageManager
  );
  const lockFilePath = findLockFile(packageManagerInfo);
  const fileHash = await hashFile(lockFilePath);

  const primaryKey = `${platform}-${packageManager}-${fileHash}`;
  core.saveState(State.CachePrimaryKey, primaryKey);

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

const findLockFile = (packageManager: PackageManagerInfo) => {
  let lockFiles = packageManager.lockFilePatterns;
  const workspace = process.env.GITHUB_WORKSPACE!;
  const rootContent = fs.readdirSync(workspace);

  const lockFile = lockFiles.find(item => rootContent.includes(item));
  if (!lockFile) {
    throw new Error(
      `Dependencies lock file is not found in ${workspace}. Supported file patterns: ${lockFiles.toString()}`
    );
  }

  return path.resolve(lockFile);
};
