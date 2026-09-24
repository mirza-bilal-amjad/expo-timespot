/** @type {import('@jest/types').Config.ProjectConfig} */
module.exports = {
  preset: "jest-expo",
  setupFiles: [
    "<rootDir>/test/setup.ts",
    "<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js",
  ],
}
