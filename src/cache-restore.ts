import * as cache from '@actions/cache';
import * as core from '@actions/core';

import {State, Inputs, Outputs} from './constants';
import {
  getCacheDirectoryPath,
  hashFile,
  isPackageManagerCacheSupported
} from './cache-utils';

export const restoreCache = async (toolName: string, version: string) => {
  if (!isPackageManagerCacheSupported(toolName)) {
    throw new Error(`${toolName} is not supported`);
  }
  const lockKey = core.getInput(Inputs.Key, {required: true});
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
