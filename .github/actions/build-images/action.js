const fs = require('fs');
const path = require('path');
const core = require('@actions/core');
const exec = require('@actions/exec');
const http = require('@actions/http-client');
const semver = require('semver');

function parseVersion(version) {
  const cleaned = version.split('/').slice(-1)[0];
  const prefix = cleaned.startsWith('v') ? 'v' : '';
  const parsed = semver.parse(cleaned);
  if (!parsed) {
    return {
      version: version,
      tags: [version]
    };
  }

  let tags = [
    `${parsed.major}`,
    `${parsed.major}.${parsed.minor}`,
    `${parsed.major}.${parsed.minor}.${parsed.patch}`,
  ];

  const hasPrerelease = parsed.prerelease.length > 0;
  if (hasPrerelease) {
    tags = tags.map(tag => `${tag}-${parsed.prerelease.join('.')}`)
  }

  const hasBuild = parsed.build.length > 0;
  if (hasBuild) {
    tags.push(`${tags.slice(-1)[0]}+${parsed.build.join('.')}`);
  }

  return {
    version: parsed.raw,
    tags: tags.map(tag => `${prefix}${tag}`)
  }
}

(async function() {
  const inputs = {
    repository: (core.getInput('repository') || "directus/directus").toLowerCase(),
    registry: (core.getInput('registry') || "").toLowerCase(),
    username: core.getInput('username'),
    password: core.getInput('password'),
    version: core.getInput('version') || "latest",
    push: /true/i.test(core.getInput('push')),
    latest: /true/i.test(core.getInput('latest')),
  };

  const repository = inputs.repository.toLowerCase();
  const registry = inputs.registry.toLowerCase();

  if (inputs.version === "latest") {
    const client = new http.HttpClient('Directus-Action');
    const response = await client.getJson(`https://api.github.com/repos/${inputs.repository}/releases`);
    inputs.version = response.result[0].tag_name;
  }

  const version = parseVersion(inputs.version);
  const target = [registry, repository].filter(part => !!part).join('/');

  if (inputs.registry.length > 0 && inputs.push) {
    core.startGroup('Docker authentication');
    await exec.exec('docker', [
      'login', '-u', inputs.username, '-p', inputs.password, inputs.registry
    ]);
    core.endGroup();
  }

  const imagesRoot = path.join(process.env.GITHUB_WORKSPACE || process.cwd(), 'docker');
  const images = await fs.promises.readdir(imagesRoot);
  for (const image of images.filter(image => !image.startsWith('.'))) {
    const metadata = require(path.join(imagesRoot, image, 'image.json'));

    core.startGroup(`Building "${image}" (version "${version.version}")`);
    await exec.exec('docker', ['buildx', 'build',
      '--load',
      '--tag', `artifact:${image}`,
      '--build-arg', `VERSION=${version.version}`,
      '--build-arg', `REPOSITORY=${repository}`,
      path.join(imagesRoot, image)
    ]);
    core.endGroup();

    core.startGroup(`Tagging "${image}" image`);
    for (const tag of version.tags) {
      const fqdn = `${target}:${tag}${metadata.suffix}`;
      await exec.exec('docker', ['tag', `artifact:${image}`, fqdn]);
    }
    if (inputs.latest) {
      await exec.exec('docker', ['tag', `artifact:${image}`, `${target}:latest${metadata.suffix}`]);
    }
    core.endGroup();

    if (inputs.registry.length > 0 && inputs.push) {
      core.startGroup(`Pushing "${image}" tags`);
      for (const tag of version.tags) {
        const fqdn = `${target}:${tag}${metadata.suffix}`;
        await exec.exec('docker', ['push', fqdn]);
      }
      if (inputs.latest) {
        await exec.exec('docker', ['tag', `artifact:${image}`, `${target}:latest${metadata.suffix}`]);
      }
      core.endGroup();
    }
  }

})().catch(error => {
  core.setFailed(error.message);
});
