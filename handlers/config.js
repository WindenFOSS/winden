const fs = require('fs');
const toml = require('@iarna/toml');
const path = require('path');

let configCache = {};
let watchers = new Map();

/**
 * Loads and parses a TOML file and returns it as a JSON object.
 * Implements caching and robust file watching for automatic updates.
 *
 * @param {string} filePath - The path to the TOML file.
 * @returns {object} - The parsed TOML content as a JSON object.
 */
function loadConfig(filePath = 'config.toml') {
  // Resolve full path
  const fullPath = path.resolve(filePath);

  try {
    // Check if config is already cached
    if (!configCache[fullPath]) {
      // Initial load
      const tomlString = fs.readFileSync(fullPath, 'utf8');
      configCache[fullPath] = toml.parse(tomlString);

      // Set up file watcher if not already watching
      if (!watchers.has(fullPath)) {
        const watcher = fs.watch(fullPath, {persistent: true}, (eventType) => {
          if (eventType === 'change') {
            // Add small delay to ensure file is fully written
            setTimeout(() => {
              try {
                const updatedTomlString = fs.readFileSync(fullPath, 'utf8');
                const updatedConfig = toml.parse(updatedTomlString);
                configCache[fullPath] = updatedConfig;
                console.log(`Configuration updated: ${fullPath}`);
              } catch (watcherErr) {
                console.error(`Error updating configuration ${fullPath}:`, watcherErr);
                // Keep using existing config on error
              }
            }, 100);
          }
        });

        // Handle watcher errors
        watcher.on('error', (error) => {
          console.error(`Watcher error for ${fullPath}:`, error);
          watcher.close();
          watchers.delete(fullPath);
        });

        watchers.set(fullPath, watcher);
      }
    }

    return configCache[fullPath];
  } catch (err) {
    console.error(`Error reading or parsing TOML file ${fullPath}:`, err);
    throw err;
  }
}

// Clean up watchers on process exit
process.on('exit', () => {
  for (const watcher of watchers.values()) {
    watcher.close();
  }
  watchers.clear();
});

module.exports = loadConfig;