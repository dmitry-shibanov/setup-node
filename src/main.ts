import * as core from '@actions/core';
import * as installer from './installer';
import * as auth from './authutil';
import * as path from 'path';
import {restoreCache} from './cache-restore';
import {Inputs} from './constants';
import {URL} from 'url';
import os = require('os');

export async function run() {
  try {
    //
    // Version is optional.  If supplied, install / use from the tool cache
    // If not supplied then task is still used to setup proxy, auth, etc...
    //
    let version = core.getInput(Inputs.NodeVersion);
    if (!version) {
      version = core.getInput(Inputs.Version);
    }

    let arch = core.getInput(Inputs.Architecture);
    const cache = core.getInput(Inputs.Cache);
    core.info(`cache is ${cache}`);

    // if architecture supplied but node-version is not
    // if we don't throw a warning, the already installed x64 node will be used which is not probably what user meant.
    if (arch && !version) {
      core.warning(
        '`architecture` is provided but `node-version` is missing. In this configuration, the version/architecture of Node will not be changed. To fix this, provide `architecture` in combination with `node-version`'
      );
    }

    if (!arch) {
      arch = os.arch();
    }

    if (version) {
      let token = core.getInput(Inputs.Token);
      let auth = !token || isGhes() ? undefined : `token ${token}`;
      let stable =
        (core.getInput(Inputs.Stable) || 'true').toUpperCase() === 'TRUE';
      const checkLatest =
        (core.getInput(Inputs.CheckLatest) || 'false').toUpperCase() === 'TRUE';
      await installer.getNode(version, stable, checkLatest, auth, arch);
    }

    const registryUrl: string = core.getInput(Inputs.RegistryUrl);
    const alwaysAuth: string = core.getInput(Inputs.AlwaysAuth);
    if (registryUrl) {
      auth.configAuthentication(registryUrl, alwaysAuth);
    }

    if (cache) {
      if (!isGhes()) {
        await restoreCache(cache, version);
      } else {
        core.info('Caching is not supported on GHES');
      }
    }

    const matchersPath = path.join(__dirname, '../..', '.github');
    core.info(`##[add-matcher]${path.join(matchersPath, 'tsc.json')}`);
    core.info(
      `##[add-matcher]${path.join(matchersPath, 'eslint-stylish.json')}`
    );
    core.info(
      `##[add-matcher]${path.join(matchersPath, 'eslint-compact.json')}`
    );
  } catch (error) {
    core.setFailed(error.message);
  }
}

function isGhes(): boolean {
  const ghUrl = new URL(
    process.env['GITHUB_SERVER_URL'] || 'https://github.com'
  );
  return ghUrl.hostname.toUpperCase() !== 'GITHUB.COM';
}
