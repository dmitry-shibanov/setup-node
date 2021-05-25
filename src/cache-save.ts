import * as core from '@actions/core';
import * as cache from '@actions/cache';
import {Inputs, LockType, State} from './constants';
import {getDefaultCacheDirectory, getYarnVersion} from './cache';

async function run() {
  const cacheLock = core.getInput(Inputs.Cache);
  if (cacheLock) {
    try {
      cachePackages(cacheLock);
    } catch (error) {
      core.setFailed('Failed to remove private key');
    }
  }
}

export const cachePackages = async (type: LockType | string) => {
  let tool = 'npm';

  const state = getCacheState();
  const primaryKey = core.getState(State.CachePrimaryKey);

  if (type === LockType.Yarn) {
    const yarnVersion = await getYarnVersion();
    tool = `yarn${yarnVersion}`;
  }

  const cachePath = await getDefaultCacheDirectory(tool);
  core.info(`cachePath is ${cachePath}`);
  core.info(`primaryKey is ${primaryKey}`);
  core.info(`state is ${state}`);
  if (isExactKeyMatch(primaryKey, state)) {
    core.info(
      `Cache hit occurred on the primary key ${primaryKey}, not saving cache.`
    );
    return;
  }

  try {
    await cache.saveCache([cachePath], primaryKey);
    core.info(`Cache saved with key: ${primaryKey}`);
  } catch (error) {
    if (error.name === cache.ValidationError.name) {
      throw error;
    } else if (error.name === cache.ReserveCacheError.name) {
      core.info(error.message);
    } else {
      const warningPrefix = '[warning]';
      core.info(`${warningPrefix}${error.message}`);
    }
  }
};

export function getCacheState(): string | undefined {
  const cacheKey = core.getState(State.CacheMatchedKey);
  if (cacheKey) {
    core.debug(`Cache state/key: ${cacheKey}`);
    return cacheKey;
  }

  return undefined;
}

export function isExactKeyMatch(key: string, cacheKey?: string): boolean {
  return !!(
    cacheKey &&
    cacheKey.localeCompare(key, undefined, {
      sensitivity: 'accent'
    }) === 0
  );
}

run();
