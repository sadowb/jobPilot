import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
const [,, a, b, out, x, y, w, h] = process.argv;
const A = PNG.sync.read(readFileSync(a)), B = PNG.sync.read(readFileSync(b));
const [X,Y,W,H]=[x,y,w,h].map(Number);
const o = new PNG({ width: W, height: H * 2 + 4 });
o.data.fill(255);
for (const [img, off] of [[A,0],[B,H+4]]) for (let j=0;j<H;j++) for (let i=0;i<W;i++){const s=((Y+j)*img.width+X+i)*4,d=((off+j)*W+i)*4;o.data.set(img.data.subarray(s,s+4),d);}
writeFileSync(out, PNG.sync.write(o));
