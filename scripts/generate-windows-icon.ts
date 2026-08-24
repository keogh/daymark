import fs from 'node:fs/promises';
import path from 'node:path';

import pngToIco from 'png-to-ico';

const sourcePath = path.resolve('assets/icon/daymark.png');
const outputPath = path.resolve('assets/icon/daymark.ico');

const icon = await pngToIco(sourcePath);
await fs.writeFile(outputPath, icon);

console.log(`Generated ${path.relative(process.cwd(), outputPath)}`);
