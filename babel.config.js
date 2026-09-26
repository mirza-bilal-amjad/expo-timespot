/** @type {import('@babel/core').TransformOptions} */
module.exports = function (api) {
  // Jest runs without `--experimental-vm-modules`, so a native dynamic
  // `import()` (search.ts loads its names that way — a separate chunk on
  // web, task 6.1) can't run there. In tests only, compile it to a
  // promise-wrapped `require`; Metro keeps real code splitting.
  const isTest = api.env("test")
  return {
    presets: ["babel-preset-expo"],
    ...(isTest ? { plugins: ["@babel/plugin-transform-dynamic-import"] } : null),
  }
}
