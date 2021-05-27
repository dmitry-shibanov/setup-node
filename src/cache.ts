import * as exec from '@actions/exec';
import * as core from '@actions/core';
import {LockType} from './constants';
import {major} from 'semver';

const toolCacheCommands = {
  npm: 'npm config get cache',
  yarn1: 'yarn cache dir',
  yarn2: 'yarn config get cacheFolder'
};

const getToolVersion = async (
  toolName: string,
  command: string,
  regex?: RegExp | string
) => {
  let stdErr: string | undefined;
  let stdOut: string | undefined;
  let toolVersion: string;

  await exec.exec(`${toolName} ${command}`, undefined, {
    listeners: {
      stdout: (err: Buffer) => (stdOut = err.toString()),
      stderr: (out: Buffer) => (stdErr = out.toString())
    }
  });

  core.info(`stdout is ${stdOut}`);
  core.info(`stdErr is ${stdErr}`);

  if (stdErr) {
    throw new Error(stdErr);
  }

  if (!stdOut) {
    throw new Error(`Could not get version for ${toolName}`);
  }

  if (regex) {
    core.info('add regex support');
    toolVersion = stdOut;
  } else {
    toolVersion = major(stdOut).toString();
  }

  return toolVersion;
};

const getCmdCommand = (toolName: string, version: string) => {
  let cmdCommand = toolName;
  if (toolName === 'yarn') {
    cmdCommand = `${toolName}${version}`;
  }

  return cmdCommand;
};

export const isToolSupported = toolName => {
  const arr = Array.of<string>(...Object.values(LockType));
  return arr.includes(toolName);
};

export const getDefaultCacheDirectory = async (toolName: string) => {
  let stdOut: string | undefined;
  let stdErr: string | undefined;

  if (!isToolSupported(toolName)) {
    throw new Error(`${toolName} is not supported`);
  }

  const toolVersion = await getToolVersion(toolName, '--version');
  const fullToolName = getCmdCommand(toolName, toolVersion);
  const toolCommand = toolCacheCommands[fullToolName];

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
    throw new Error(`Could not get version for ${toolName}`);
  }

  return stdOut;
};
