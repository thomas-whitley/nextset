const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for .wasm files in web builds
config.resolver.assetExts.push('wasm');

// Configure web-specific handling for wa-sqlite.wasm
if (process.env.EXPO_PLATFORM === 'web') {
  config.transformer = {
    ...config.transformer,
    assetPlugins: ['expo-asset/tools/hashAssetFiles'],
  };
  
  // Ensure WASM files are treated as assets
  config.resolver.platforms = ['web', 'native', 'ios', 'android'];
}

module.exports = config;