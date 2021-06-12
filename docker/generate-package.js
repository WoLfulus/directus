#!/usr/bin/env node

const fs = require('fs');

let package = require('./package.json')

let version = process.env.VERSION;
if (version.startsWith('v')) {
  version = version.substr(1);
}

let packageNew = {
  name: "project",
  version: "1.0.0",
  dependencies: {
    ...package.optionalDependencies,
    directus: `${version}`
  }
};

// Oracle doesn't like ARM, we don't like building it.
if (process.arch == 'arm64') {
  if (packageNew.dependencies.oracledb) {
    delete packageNew.dependencies.oracledb
  }
}

fs.writeFileSync('./package.json', JSON.stringify(packageNew, null, 2));
