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

export const restoreCache = async (toolName: string, version: string) => {
  if (!isPackageManagerCacheSupported(toolName)) {
    throw new Error(`${toolName} is not supported`);
  }
  const lockKey = getLockFile(toolName);

  const platform = process.env.RUNNER_OS;
  const fileHash = await hashFile(lockKey);

  const primaryKey = `${platform}-${toolName}-${version}-${fileHash}`;
  core.saveState(State.CachePrimaryKey, primaryKey);

  const cachePath = await getCacheDirectoryPath(toolName);
  const cacheKey = await cache.restoreCache([cachePath], primaryKey);

  if (!cacheKey) {
    core.warning(`Cache not found for input keys: ${primaryKey}`);
    return;
  }

  core.saveState(State.CacheMatchedKey, cacheKey);
  const isExactMatch = (primaryKey === cacheKey).toString();
  core.setOutput(Outputs.CacheHit, isExactMatch);
  core.info(`Cache restored from key: ${cacheKey}`);
};

const getLockFile = (cacheType: string) => {
  let lockFile = 'package-lock.json';
  const workspace = process.env.GITHUB_WORKSPACE!;
  const rootContent = fs.readdirSync(workspace);
  if (cacheType === 'yarn') {
    lockFile = 'yarn.lock';
  }

  const fullLockFile = rootContent.find(item => lockFile === item);
  if (!fullLockFile) {
    throw new Error('No package-lock.json or yarn.lock were found');
  }

  return path.resolve(fullLockFile);
};
