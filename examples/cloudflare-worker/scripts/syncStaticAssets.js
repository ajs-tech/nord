// Copy files from the static-assets directory to the dist directory using fs
// This script is executed by the build process
const fs = require('fs')
import { RESET_STYLES } from '@toddledev/core/dist/styling/theme.const'
;[
  'esm-page.main.js',
  'esm-page.main.js.map',
  'esm-custom-element.main.js',
].forEach((f) =>
  fs.copyFileSync(
    `${__dirname}/../node_modules/@toddledev/runtime/dist/${f}`,
    `${__dirname}/../assets/_static/${f}`,
  ),
)
fs.writeFileSync(`${__dirname}/../assets/_static/reset.css`, RESET_STYLES)
fs.copyFileSync(
  `${__dirname}/../__project__/project.json`,
  `${__dirname}/../dist/project.json`,
)
