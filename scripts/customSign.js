/**
 * Custom signing script that does nothing (unsigned build).
 * This prevents electron-builder from downloading winCodeSign,
 * which fails on Windows without Developer Mode due to macOS symlinks in the 7z archive.
 */
exports.default = async function (configuration) {
  // No-op: skip code signing entirely
  console.log(`[customSign] Skipping signing for: ${configuration.path}`);
};
