import * as core from '@actions/core';
import * as cache from '@actions/cache';
import {State} from './constants';
import {getCacheDirectoryPath, getPackageManagerInfo} from './cache-utils';

async function run() {
  const cacheLock = core.getInput('cache');
  try {
    await cachePackages(cacheLock);
  } catch (error) {
    core.setFailed(error.message);
  }
}

const cachePackages = async (packageManager: string) => {
  const state = core.getState(State.CacheMatchedKey);
  const primaryKey = core.getState(State.CachePrimaryKey);

  const packageManagerInfo = await getPackageManagerInfo(packageManager);
  if (!packageManagerInfo) {
    core.debug(`Caching for '${packageManager}' is not supported`);
    return;
  }

  const cachePath = await getCacheDirectoryPath(
    packageManagerInfo,
    packageManager
  );
  if (primaryKey === state) {
    core.info(
      `Cache hit occurred on the primary key ${primaryKey}, not saving cache.`
    );
    return;
  }

  try {
    await cache.saveCache([cachePath], primaryKey);
    core.info(`Cache saved with the key: ${primaryKey}`);
  } catch (error) {
    if (error.name === cache.ValidationError.name) {
      throw error;
    } else if (error.name === cache.ReserveCacheError.name) {
      core.info(error.message);
    } else {
      core.warning(`${error.message}`);
    }
  }
};

run();
