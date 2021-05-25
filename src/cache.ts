import * as exec from '@actions/exec';
import {major} from 'semver';

const toolCommands = {
  npm: 'npm config get cache',
  yarn1: 'yarn cache dir',
  yarn2: 'yarn config get cacheFolder'
};

export const getYarnVersion = async () => {
  let stdErr: string | undefined;
  let stdOut: string | undefined;
  let majorVersion: string;

  await exec.exec('yarn --version', undefined, {
    listeners: {
      stdout: (err: Buffer) => (stdOut = err.toString()),
      stderr: (out: Buffer) => (stdErr = out.toString())
    }
  });

  if (stdErr) {
    throw new Error(stdErr);
  }

  if (!stdOut) {
    throw new Error('Could not get version for yarn');
  }

  return major(stdOut);
};

export const getDefaultCacheDirectory = async (tool: string) => {
  let stdOut: string | undefined;
  let stdErr: string | undefined;

  const toolCommand = toolCommands[tool];

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
    throw new Error('Could not get version for yarn');
  }

  return stdOut;
};
