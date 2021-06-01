import * as exec from '@actions/exec';
import {LockType} from './constants';
import * as glob from '@actions/glob';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as stream from 'stream';
import * as util from 'util';
import * as path from 'path';

const toolCacheCommands = {
  npm: 'npm config get cache',
  yarn1: 'yarn cache dir',
  yarn2: 'yarn config get cacheFolder'
};

const getCommandOutput = async (toolCommand: string, errMessage?: string) => {
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

  if (!stdOut) {
    throw new Error(errMessage);
  }

  return stdOut;
};

const getpackageManagerVersion = async (
  packageManager: string,
  command: string,
  regex?: RegExp | string
) => {
  const stdOut = await getCommandOutput(
    `${packageManager} ${command}`,
    `Could not get version for ${packageManager}`
  );

  if (stdOut.startsWith('1.')) {
    return '1';
  }

  return '2';
};

const getCmdCommand = async (packageManager: string) => {
  let cmdCommand = packageManager;
  if (packageManager === 'yarn') {
    const toolVersion = await getpackageManagerVersion(
      packageManager,
      '--version'
    );
    cmdCommand = `${packageManager}${toolVersion}`;
  }

  return cmdCommand;
};

export const isPackageManagerCacheSupported = packageManager => {
  const arr = Array.of<string>(...Object.values(LockType));
  return arr.includes(packageManager);
};

export const getCacheDirectoryPath = async (packageManager: string) => {
  const fullToolName = await getCmdCommand(packageManager);
  const toolCommand = toolCacheCommands[fullToolName];

  const stdOut = await getCommandOutput(
    toolCommand,
    `Could not get version for ${packageManager}`
  );

  return stdOut;
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
    console.log(globber);
    console.log(`fileis ${file}`);
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

  // node -e "const prmosify = require('util').promisify; const crypto = require('crypto'); const stream = require('stream'); const file = '/Users/dmitryshibanov/Documents/myProjects/setup-node/__tests__/data/package-lock.json'; const resul = crypto.createHash('sha256'); const hash = crypto.createHash('sha256'); const pipeline = prmosify(stream.pipeline); pipeline(fs.createReadStream(file), hash).then((result1) =>{ result.write(hash.digest()); result.end(); console.log(result.digest('hex'))}) "

  return result.digest('hex');
}
