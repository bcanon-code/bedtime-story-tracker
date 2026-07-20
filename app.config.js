const { execFileSync } = require('node:child_process');
const versionInfo = require('./version.json');

function gitValue(args, fallback) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim() || fallback;
  } catch {
    return fallback;
  }
}

const gitSha = process.env.EXPO_PUBLIC_GIT_SHA || gitValue(['rev-parse', '--short', 'HEAD'], 'unknown');
const gitDirty = process.env.EXPO_PUBLIC_GIT_DIRTY ||
  (gitValue(['status', '--porcelain'], '') ? 'true' : 'false');

process.env.EXPO_PUBLIC_APP_VERSION ||= versionInfo.version;
process.env.EXPO_PUBLIC_BUILD_NUMBER ||= String(versionInfo.build);
process.env.EXPO_PUBLIC_GIT_SHA ||= gitSha;
process.env.EXPO_PUBLIC_GIT_DIRTY ||= gitDirty;
process.env.EXPO_PUBLIC_BUILD_ENVIRONMENT ||= 'Local Development';

module.exports = {
  expo: {
    name: 'Bedtime Story Tracker',
    slug: 'bedtime-story-tracker',
    version: versionInfo.version,
    platforms: ['web'],
  },
};
