import * as cache from '@actions/cache';
import * as core from '@actions/core';
import * as glob from '@actions/glob';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as stream from 'stream';
import * as util from 'util';
import * as path from 'path';

import {State, LockType, Inputs, Outputs} from './constants';
import {getYarnVersion, getDefaultCacheDirectory} from './cache';

export const restoreCache = async (type: LockType | string) => {
  let tool = 'npm';

  const lockKey = core.getInput(Inputs.Key, {required: true});
  const currentOs = process.env.RUNNER_OS;
  const fileHash = await hashFile(lockKey);

  if (type === LockType.Yarn) {
    const yarnVersion = await getYarnVersion();
    tool = `yarn${yarnVersion}`;
  }

  const primaryKey = `${currentOs}-${tool}-${fileHash}`;
  core.saveState(State.CachePrimaryKey, primaryKey);

  const cachePath = await getDefaultCacheDirectory(tool);
  core.info(`cachePath is ${cachePath}`);
  core.info(`primaryKey is ${primaryKey}`);
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

async function hashFile(matchPatterns: string): Promise<string> {
  let followSymbolicLinks = false;
  if (process.env.followSymbolicLinks === 'true') {
    followSymbolicLinks = true;
  }

  let hasMatch = false;
  const githubWorkspace = process.env.GITHUB_WORKSPACE;
  const result = crypto.createHash('sha256');
  let count = 0;
  const globber = await glob.create(matchPatterns, {followSymbolicLinks});
  for await (const file of globber.globGenerator()) {
    console.log(file);
    if (!file.startsWith(`${githubWorkspace}${path.sep}`)) {
      console.log(`Ignore '${file}' since it is not under GITHUB_WORKSPACE.`);
      continue;
    }
    if (fs.statSync(file).isDirectory()) {
      console.log(`Skip directory '${file}'.`);
      continue;
    }
    const hash = crypto.createHash('sha256');
    const pipeline = util.promisify(stream.pipeline);
    await pipeline(fs.createReadStream(file), hash);
    result.write(hash.digest());
    count++;
    if (!hasMatch) {
      hasMatch = true;
    }
  }
  result.end();

  return result.digest('hex');
}
