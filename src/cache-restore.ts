import * as cache from '@actions/cache';
import * as core from '@actions/core';
import {State, LockType, Inputs, Outputs} from './constants';
import {getYarnVersion, getDefaultCacheDirectory} from './cache';

export const restoreCache = async (type: LockType | string) => {
  let tool = 'npm';

  const primaryKey = core.getInput(Inputs.Key, {required: true});
  core.saveState(State.CachePrimaryKey, primaryKey);

  if (type === LockType.Yarn) {
    const yarnVersion = await getYarnVersion();
    tool = `yarn${yarnVersion}`;
  }

  const cachePath = await getDefaultCacheDirectory(tool);
  const cacheKey = await cache.restoreCache([cachePath], primaryKey);

  if (!cacheKey) {
    core.info(`Cache not found for input keys: ${primaryKey}`);
    return;
  }

  core.saveState(State.CacheMatchedKey, cacheKey);
  const isExactMatch = (primaryKey === cacheKey).toString();
  core.debug(`isExactMatch is ${isExactMatch}`);
  core.setOutput(Outputs.CacheHit, isExactMatch);
  core.info(`Cache restored from key: ${cacheKey}`);
};
