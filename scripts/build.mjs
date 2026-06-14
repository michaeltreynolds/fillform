/* Build a ready-to-install Chrome extension zip.
 *
 * Stages the extension files into dist/fillform/, then writes dist/fillform.zip
 * with manifest.json at the archive root and FORWARD-SLASH paths (Chrome rejects
 * the backslash paths that PowerShell's Compress-Archive produces). No npm
 * dependencies — a tiny ZIP writer built on node's zlib.
 *
 * Usage:  npm run build   (or)   node scripts/build.mjs
 */
import { mkdirSync, rmSync, cpSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import { join, relative, sep } from "node:path";

const STAGE = "dist/fillform";
const ZIP = "dist/fillform.zip";
const INCLUDE = ["manifest.json", "src"];

// ---- stage -----------------------------------------------------------------
console.log("Staging extension files…");
rmSync("dist", { recursive: true, force: true });
mkdirSync(STAGE, { recursive: true });
for (const item of INCLUDE) cpSync(item, `${STAGE}/${item}`, { recursive: true });

// ---- minimal zip writer ----------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function zipDir(srcDir, zipPath) {
  const files = walk(srcDir);
  const parts = [];
  const central = [];
  let offset = 0;
  const dosTime = 0, dosDate = 0x21; // fixed 1980-01-01 → reproducible builds

  for (const file of files) {
    const name = Buffer.from(relative(srcDir, file).split(sep).join("/"), "utf8");
    const data = readFileSync(file);
    const crc = crc32(data);
    const comp = deflateRawSync(data);
    const useDeflate = comp.length < data.length;
    const method = useDeflate ? 8 : 0;
    const stored = useDeflate ? comp : data;

    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(20, 4);
    lfh.writeUInt16LE(method, 8);
    lfh.writeUInt16LE(dosTime, 10);
    lfh.writeUInt16LE(dosDate, 12);
    lfh.writeUInt32LE(crc, 14);
    lfh.writeUInt32LE(stored.length, 18);
    lfh.writeUInt32LE(data.length, 22);
    lfh.writeUInt16LE(name.length, 26);
    parts.push(lfh, name, stored);

    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(0x02014b50, 0);
    cdh.writeUInt16LE(20, 4);
    cdh.writeUInt16LE(20, 6);
    cdh.writeUInt16LE(method, 10);
    cdh.writeUInt16LE(dosTime, 12);
    cdh.writeUInt16LE(dosDate, 14);
    cdh.writeUInt32LE(crc, 16);
    cdh.writeUInt32LE(stored.length, 20);
    cdh.writeUInt32LE(data.length, 24);
    cdh.writeUInt16LE(name.length, 28);
    cdh.writeUInt32LE(offset, 42);
    central.push(cdh, name);

    offset += lfh.length + name.length + stored.length;
  }

  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);

  writeFileSync(zipPath, Buffer.concat([...parts, centralBuf, eocd]));
  return files.length;
}

console.log("Zipping…");
const n = zipDir(STAGE, ZIP);

console.log(`\nDone → ${ZIP} (${n} files)`);
console.log("Install: chrome://extensions → Developer mode → drag the zip in,");
console.log("or 'Load unpacked' and pick the dist/fillform folder.");
