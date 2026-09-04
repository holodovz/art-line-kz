#!/usr/bin/env node
// Build CryptoBank APK with proper binary AndroidManifest and resources.arsc
// - Uses dist/public as web assets
// - Generates binary manifest + resources via aapt2 + android.jar (pure aapt2, no Gradle)
// - Falls back to text manifest if aapt2 not available
// - Packs via JSZip and signs via node-forge (no Java required)
// - Produces dist/cryptobank.apk and android/app/build/outputs/apk/debug/app-debug.apk
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import JSZip from 'jszip';
import forge from 'node-forge';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distPublic = path.join(root, 'dist', 'public');
const outDir = path.join(root, 'dist');
const apkPath = path.join(outDir, 'cryptobank.apk');
const apkDevPath = path.join(outDir, 'cryptobank-development.apk');

if (!fs.existsSync(distPublic)) {
  console.error('[APK] dist/public not found, run pnpm run build first');
  process.exit(1);
}

async function collectFiles(dir, base = '') {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.join(base, e.name);
    if (e.isDirectory()) files.push(...await collectFiles(full, rel));
    else files.push({ full, rel, data: await fs.promises.readFile(full) });
  }
  return files;
}

function versionToCode(version) {
  const parts = (version || '1.0.0').split('.').map(Number);
  const major = parts[0] || 0;
  const minor = parts[1] || 0;
  const patch = parts[2] || 0;
  return major * 1e4 + minor * 100 + patch;
}

function generateManifestXml(config) {
  const orientationMap = { portrait: 'portrait', landscape: 'landscape', auto: 'unspecified' };
  const orientation = orientationMap[config.orientation] ?? 'unspecified';
  const versionCode = versionToCode(config.version);
  const allowCleartext = config.network?.cleartext ?? false;
  const permissions = [...new Set([...(config.permissions || []).map(p => p.toUpperCase()), 'INTERNET'])];
  const permissionsXml = permissions.map(p => `    <uses-permission android:name="android.permission.${p}" />`).join('\n');
  const activityName = 'com.nicron.webview.MainActivity';
  const backButton = config.webview?.backButton ?? 'history';
  const clearCache = config.webview?.clearCacheOnStart ?? false;
  const splashBg = config.splashScreen?.backgroundColor ?? '#0B1020';
  return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${config.packageId}"
    android:versionCode="${versionCode}"
    android:versionName="${config.version}">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="34" />
    
${permissionsXml}

    <application
        android:label="${config.name}"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="${allowCleartext}">
        
        <activity
            android:name="${activityName}"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|screenSize"
            android:screenOrientation="${orientation}">
            
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="cryptobank" android:host="wx-callback" />
                <data android:scheme="https" android:host="app.cryptobank" />
            </intent-filter>

            <meta-data android:name="nitron.backButton" android:value="${backButton}" />
            <meta-data android:name="nitron.clearCacheOnStart" android:value="${clearCache}" />
            <meta-data android:name="nitron.splashBackground" android:value="${splashBg}" />
        </activity>
    </application>
</manifest>`;
}

async function findAapt2() {
  const candidates = [
    path.join(os.homedir(), '.nitron', 'android', 'aapt2'),
    path.join(root, 'node_modules', 'bare-apk', 'prebuilds', 'linux-x64', 'aapt2'),
    '/usr/bin/aapt2',
  ];
  for (const p of candidates) {
    try { await fs.promises.access(p); return p; } catch {}
  }
  return null;
}

async function findAndroidJar() {
  const candidates = [
    path.join(os.homedir(), '.nitron', 'android', 'android.jar'),
    path.join(root, 'node_modules', '@drxiaozhi', 'minapk', 'tools', 'android.jar'),
  ];
  for (const p of candidates) {
    try { await fs.promises.access(p); return p; } catch {}
  }
  return null;
}

async function buildResourcesWithAapt2(config) {
  const aapt2 = await findAapt2();
  const androidJar = await findAndroidJar();
  if (!aapt2 || !androidJar) {
    console.warn('[APK] aapt2 or android.jar not found, fallback to text manifest');
    console.warn('[APK] aapt2:', aapt2, 'androidJar:', androidJar);
    return null;
  }
  console.log('[APK] Found aapt2:', aapt2, `(${((await fs.promises.stat(aapt2)).size/1024/1024).toFixed(1)} MB)`);
  console.log('[APK] Found android.jar:', androidJar, `(${((await fs.promises.stat(androidJar)).size/1024/1024).toFixed(1)} MB)`);
  const workDir = path.join(os.tmpdir(), `cryptobank-res-${Date.now()}`);
  const resDir = path.join(workDir, 'res');
  try {
    await fs.promises.mkdir(path.join(resDir, 'mipmap-anydpi-v26'), { recursive: true });
    await fs.promises.mkdir(path.join(resDir, 'values'), { recursive: true });
    const mipmaps = [
      { dpi: 'mdpi', size: 48 },
      { dpi: 'hdpi', size: 72 },
      { dpi: 'xhdpi', size: 96 },
      { dpi: 'xxhdpi', size: 144 },
      { dpi: 'xxxhdpi', size: 192 },
    ];
    for (const { dpi } of mipmaps) {
      await fs.promises.mkdir(path.join(resDir, `mipmap-${dpi}`), { recursive: true });
    }
    // Icon handling: try sharp resize, fallback to copy default icon
    const defaultIconPath = path.join(root, 'node_modules', 'nitron', 'assets', 'default-icon.png');
    let useSharp = false;
    let sharp = null;
    try {
      // try to load sharp from .pnpm
      const sharpPath = path.join(root, 'node_modules', '.pnpm', 'sharp@0.34.5', 'node_modules', 'sharp', 'lib', 'sharp.js');
      // simpler: try to require('sharp') via dynamic import with absolute
      const possible = [
        path.join(root, 'node_modules', 'sharp'),
        path.join(root, 'node_modules', '.pnpm', 'sharp@0.34.5', 'node_modules', 'sharp'),
      ];
      for (const p of possible) {
        try { await fs.promises.access(p); sharp = (await import(p)).default || (await import(p)); break; } catch {}
      }
      if (!sharp) {
        // fallback try commonjs require via createRequire
        const { createRequire } = await import('module');
        const req = createRequire(import.meta.url);
        for (const p of possible) {
          try { sharp = req(p); break; } catch {}
        }
      }
      if (sharp) useSharp = true;
    } catch {}
    const customBackground = typeof config.icon === 'object' && config.icon?.background ? config.icon.background : '#0B1020';
    if (useSharp && sharp) {
      console.log('[APK] Using sharp for icon resize');
      try {
        const defaultIconData = await fs.promises.readFile(defaultIconPath);
        for (const { dpi, size } of mipmaps) {
          const destDir = path.join(resDir, `mipmap-${dpi}`);
          await sharp(defaultIconData).resize(size, size, { fit: 'contain', background: { r: 11, g: 16, b: 32, alpha: 0 } }).png().toFile(path.join(destDir, 'ic_launcher.png'));
          await sharp(defaultIconData).resize(size, size, { fit: 'contain', background: { r: 11, g: 16, b: 32, alpha: 0 } }).png().toFile(path.join(destDir, 'ic_launcher_foreground.png'));
        }
      } catch (e) {
        console.warn('[APK] sharp resize failed, fallback to copy', e.message);
        useSharp = false;
      }
    }
    if (!useSharp) {
      console.log('[APK] Using fallback icon copy (no sharp)');
      try {
        const iconData = await fs.promises.readFile(defaultIconPath);
        for (const { dpi } of mipmaps) {
          const destDir = path.join(resDir, `mipmap-${dpi}`);
          await fs.promises.writeFile(path.join(destDir, 'ic_launcher.png'), iconData);
          await fs.promises.writeFile(path.join(destDir, 'ic_launcher_foreground.png'), iconData);
        }
      } catch (e) {
        console.warn('[APK] fallback icon copy failed', e.message);
        // create tiny 1x1 png if needed
        const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', 'base64');
        for (const { dpi } of mipmaps) {
          const destDir = path.join(resDir, `mipmap-${dpi}`);
          await fs.promises.writeFile(path.join(destDir, 'ic_launcher.png'), tinyPng);
          await fs.promises.writeFile(path.join(destDir, 'ic_launcher_foreground.png'), tinyPng);
        }
      }
    }
    const adaptiveIconXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>`;
    await fs.promises.writeFile(path.join(resDir, 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptiveIconXml);
    const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${customBackground}</color>
</resources>`;
    await fs.promises.writeFile(path.join(resDir, 'values', 'colors.xml'), colorsXml);
    // Also need strings? Not needed but create dummy
    await fs.promises.writeFile(path.join(resDir, 'values', 'strings.xml'), `<?xml version="1.0" encoding="utf-8"?><resources><string name="app_name">${config.name}</string></resources>`);

    const manifestXml = generateManifestXml(config);
    const manifestPath = path.join(workDir, 'AndroidManifest.xml');
    await fs.promises.writeFile(manifestPath, manifestXml);
    console.log('[APK] Generated manifest for', config.packageId, 'deep-link cryptobank://wx-callback');

    const compiledZip = path.join(workDir, 'compiled.zip');
    try {
      await execFileAsync(aapt2, ['compile', '--dir', resDir, '-o', compiledZip], { maxBuffer: 10 * 1024 * 1024 });
      console.log('[APK] aapt2 compile ok', (await fs.promises.stat(compiledZip)).size, 'bytes');
    } catch (err) {
      console.error('[APK] aapt2 compile failed', err.stderr || err.message);
      throw err;
    }
    const resourcesApk = path.join(workDir, 'resources.apk');
    try {
      await execFileAsync(aapt2, ['link', compiledZip, '--manifest', manifestPath, '-I', androidJar, '-o', resourcesApk, '--auto-add-overlay'], { maxBuffer: 10 * 1024 * 1024 });
      console.log('[APK] aapt2 link ok', (await fs.promises.stat(resourcesApk)).size, 'bytes');
    } catch (err) {
      console.error('[APK] aapt2 link failed', err.stderr || err.message);
      // try without --auto-add-overlay
      try {
        await execFileAsync(aapt2, ['link', compiledZip, '--manifest', manifestPath, '-I', androidJar, '-o', resourcesApk], { maxBuffer: 10 * 1024 * 1024 });
        console.log('[APK] aapt2 link retry ok');
      } catch (err2) {
        throw err2;
      }
    }
    // Extract resources.arsc, AndroidManifest.xml, res/* from resources.apk
    const apkData = await fs.promises.readFile(resourcesApk);
    const apkZip = await JSZip.loadAsync(apkData);
    const extracted = {};
    for (const [name, file] of Object.entries(apkZip.files)) {
      if (file.dir) continue;
      if (name === 'AndroidManifest.xml' || name === 'resources.arsc' || name.startsWith('res/')) {
        extracted[name] = await file.async('nodebuffer');
      }
    }
    console.log('[APK] Extracted', Object.keys(extracted).join(', '));
    if (!extracted['AndroidManifest.xml'] || !extracted['resources.arsc']) {
      throw new Error('Missing AndroidManifest.xml or resources.arsc from aapt2 link output');
    }
    // Verify manifest is binary (first bytes 0x03 0x00 0x08 0x00)
    const mf = extracted['AndroidManifest.xml'];
    const isBinary = mf[0] === 0x03 && mf[1] === 0x00;
    console.log('[APK] Manifest binary check:', isBinary ? 'OK (binary AXML)' : 'FAIL (text)', `header ${mf[0].toString(16)} ${mf[1].toString(16)} size ${mf.length}`);
    if (!isBinary) throw new Error('Generated manifest is not binary');
    // Cleanup
    await fs.promises.rm(workDir, { recursive: true, force: true }).catch(()=>{});
    return extracted;
  } catch (e) {
    console.warn('[APK] buildResourcesWithAapt2 failed, fallback', e.message);
    try { await fs.promises.rm(workDir, { recursive: true, force: true }); } catch {}
    return null;
  }
}

// Generate debug keypair + cert via node-forge
function generateKeypair() {
  console.log('[APK] Generating debug RSA keypair (2048) via node-forge...');
  const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 30);
  const attrs = [
    { name: 'commonName', value: 'CryptoBank Debug' },
    { name: 'organizationName', value: 'CryptoBank' },
    { name: 'organizationalUnitName', value: 'Development' },
    { name: 'countryName', value: 'US' }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'subjectAltName', altNames: [{ type: 6, value: 'https://cryptobank.app' }] }
  ]);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return { keys, cert };
}

function createPKCS7(cert, privateKey, data) {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(data, 'utf8');
  p7.addCertificate(cert);
  p7.addSigner({
    key: privateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() }
    ]
  });
  p7.sign();
  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return Buffer.from(der, 'binary');
}

async function buildAPK() {
  console.log('[APK] Building CryptoBank APK...');
  let config = { packageId: 'com.app.cryptobank', version: '1.0.0', name: 'CryptoBank', orientation: 'portrait', permissions: ['INTERNET','ACCESS_NETWORK_STATE','VIBRATE'], network: { cleartext: false }, webview: { backButton: 'history', clearCacheOnStart: false }, splashScreen: { backgroundColor: '#0B1020' }, icon: null };
  try {
    const raw = await fs.promises.readFile(path.join(root, 'nitron.config.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    config = { ...config, ...parsed };
    if (!config.packageId) config.packageId = 'com.app.cryptobank';
    console.log('[APK] Loaded nitron.config.json', config.packageId, config.version);
  } catch {}
  console.log('[APK] Package:', config.packageId);
  console.log('[APK] Scheme: cryptobank://wx-callback');
  console.log('[APK] WebDir: dist/public');

  const files = await collectFiles(distPublic);
  console.log(`[APK] Collected ${files.length} web assets`);

  let dexData = null;
  const baseApkPath = path.join(root, 'node_modules', 'nitron', 'template', 'base.apk');
  if (fs.existsSync(baseApkPath)) {
    try {
      const baseData = await fs.promises.readFile(baseApkPath);
      const baseZip = await JSZip.loadAsync(baseData);
      const dexFile = baseZip.file('classes.dex');
      if (dexFile) dexData = await dexFile.async('nodebuffer');
      console.log('[APK] Loaded classes.dex from nitron template:', dexData ? `${dexData.length} bytes` : 'not found');
    } catch (e) {
      console.warn('[APK] Failed to load base dex:', e.message);
    }
  }
  if (!dexData) {
    dexData = Buffer.from([]);
    console.warn('[APK] Using empty classes.dex fallback');
  }

  // Try to build proper binary manifest + resources.arsc via aapt2
  let aaptResources = await buildResourcesWithAapt2(config);

  const zip = new JSZip();
  if (dexData.length) zip.file('classes.dex', dexData, { compression: 'DEFLATE', compressionOptions: { level: 9 } });
  for (const f of files) {
    const apkPathFile = `assets/www/${f.rel.replace(/\\/g, '/')}`;
    zip.file(apkPathFile, f.data, { compression: 'DEFLATE' });
  }

  if (aaptResources) {
    // Add binary manifest, resources.arsc, and compiled res/
    zip.file('AndroidManifest.xml', aaptResources['AndroidManifest.xml'], { compression: 'STORE' });
    zip.file('resources.arsc', aaptResources['resources.arsc'], { compression: 'STORE' });
    for (const [name, data] of Object.entries(aaptResources)) {
      if (name.startsWith('res/')) {
        zip.file(name, data, { compression: 'DEFLATE' });
      }
    }
    console.log('[APK] Added binary manifest + resources.arsc from aapt2');
  } else {
    // Fallback text manifest (not installable but shows intent)
    let fallbackManifest = `<?xml version="1.0" encoding="utf-8"?><manifest xmlns:android="http://schemas.android.com/apk/res/android" package="${config.packageId}" android:versionCode="${versionToCode(config.version)}" android:versionName="${config.version}"><uses-sdk android:minSdkVersion="21" android:targetSdkVersion="34" /><uses-permission android:name="android.permission.INTERNET" /><application android:label="${config.name}"><activity android:name="com.nicron.webview.MainActivity" android:exported="true"><intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter><intent-filter><action android:name="android.intent.action.VIEW"/><category android:name="android.intent.category.DEFAULT"/><category android:name="android.intent.category.BROWSABLE"/><data android:scheme="cryptobank" android:host="wx-callback"/><data android:scheme="https" android:host="app.cryptobank"/></intent-filter></activity></application></manifest>`;
    zip.file('AndroidManifest.xml', fallbackManifest, { compression: 'STORE' });
    zip.file('resources.arsc', Buffer.from([0x02, 0x00, 0x0C, 0x00]), { compression: 'STORE' });
    console.warn('[APK] Used fallback text manifest (APK will NOT install) - aapt2 required for installable APK');
  }

  // Generate unsigned buffer for hashing (without META-INF)
  // We'll create META-INF after hashing, so first generate manifest hashes

  // Need to compute hashes for MANIFEST.MF generation - requires final zip entries excluding META-INF
  // For now, create a temp zip copy to compute hashes, but easier: compute after adding all non-META files
  // We'll do signing steps

  const { keys, cert } = generateKeypair();
  function sha256Base64(data) {
    return crypto.createHash('sha256').update(data).digest('base64');
  }
  const manifestEntries = [];
  zip.forEach((relativePath, file) => {
    if (!file.dir && !relativePath.startsWith('META-INF/')) {
      manifestEntries.push(relativePath);
    }
  });
  let manifestMF = 'Manifest-Version: 1.0\r\nCreated-By: CryptoBank APK Builder (node-forge+aapt2)\r\n\r\n';
  const manifestHashes = {};
  for (const name of manifestEntries) {
    const file = zip.file(name);
    const data = await file.async('nodebuffer');
    const digest = sha256Base64(data);
    manifestHashes[name] = digest;
    manifestMF += `Name: ${name}\r\nSHA-256-Digest: ${digest}\r\n\r\n`;
  }
  const manifestDigest = sha256Base64(Buffer.from(manifestMF, 'utf-8'));
  let certSF = 'Signature-Version: 1.0\r\nCreated-By: CryptoBank APK Builder (node-forge+aapt2)\r\nSHA-256-Digest-Manifest: ' + manifestDigest + '\r\n\r\n';
  for (const name of manifestEntries) {
    const entryDigest = sha256Base64(Buffer.from(`Name: ${name}\r\nSHA-256-Digest: ${manifestHashes[name]}\r\n\r\n`, 'utf-8'));
    certSF += `Name: ${name}\r\nSHA-256-Digest: ${entryDigest}\r\n\r\n`;
  }
  zip.file('META-INF/MANIFEST.MF', manifestMF, { compression: 'STORE' });
  zip.file('META-INF/CERT.SF', certSF, { compression: 'STORE' });
  let certRSA;
  try {
    certRSA = createPKCS7(cert, keys.privateKey, certSF);
    console.log('[APK] Generated CERT.RSA via node-forge, size:', certRSA.length);
  } catch (e) {
    console.warn('[APK] Failed to generate CERT.RSA:', e.message);
    certRSA = Buffer.from('dummy');
  }
  zip.file('META-INF/CERT.RSA', certRSA, { compression: 'STORE' });

  const signedBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  console.log('[APK] Signed APK size:', (signedBuffer.length / 1024).toFixed(1), 'KB');

  await fs.promises.mkdir(outDir, { recursive: true });
  await fs.promises.writeFile(apkPath, signedBuffer);
  await fs.promises.writeFile(apkDevPath, signedBuffer);
  console.log('[APK] Written:', apkPath);
  console.log('[APK] Written:', apkDevPath);

  const manifestBinary = aaptResources ? true : false;
  const apkSize = signedBuffer.length;
  const info = {
    package: config.packageId,
    scheme: 'cryptobank://wx-callback',
    host: 'wx-callback',
    version: config.version,
    versionCode: versionToCode(config.version),
    minSdk: 21,
    targetSdk: 34,
    permissions: [...new Set([...(config.permissions || []), 'INTERNET'])],
    deepLink: 'cryptobank://wx-callback?challenge={challenge}&signature={signature}&publicKey={publicKey}&address={address}',
    deepLinkHttp: 'https://app.cryptobank/wx-callback',
    activity: 'com.nicron.webview.MainActivity',
    entry: 'dist/public/index.html',
    apkSize,
    apkSizeFormatted: `${(apkSize/1024).toFixed(1)} KB`,
    builtAt: new Date().toISOString(),
    webAssets: files.length,
    signed: true,
    signer: 'CryptoBank Debug (node-forge, 2048-bit RSA, 30y)',
    manifestBinary,
    resourcesArsc: !!aaptResources,
    aapt2: !!aaptResources,
    install: 'adb install -r dist/cryptobank.apk',
    verifyDeepLink: 'adb shell am start -a android.intent.action.VIEW -d "cryptobank://wx-callback?challenge=test123"',
    verifyDeepLinkHttp: 'adb shell am start -a android.intent.action.VIEW -d "https://app.cryptobank"',
    notes: aaptResources ? 'APK built with binary manifest via aapt2 (installable). No Java required, signed via node-forge.' : 'APK built without aapt2 (text manifest) - NOT installable. Ensure aapt2+android.jar available.',
    output: apkPath,
    altOutput: apkDevPath,
    androidOut: path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
  };
  await fs.promises.writeFile(path.join(outDir, 'apk-info.json'), JSON.stringify(info, null, 2));
  console.log('[APK] Info:', JSON.stringify(info, null, 2));

  const androidOutDir = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug');
  await fs.promises.mkdir(androidOutDir, { recursive: true });
  await fs.promises.writeFile(path.join(androidOutDir, 'app-debug.apk'), signedBuffer);
  console.log('[APK] Also copied to:', path.join(androidOutDir, 'app-debug.apk'));

  // Validation: try to validate manifest binary
  if (aaptResources) {
    const mf = aaptResources['AndroidManifest.xml'];
    console.log(`\n[APK] ✅ Build complete with binary manifest (${mf.length} bytes) + resources.arsc (${aaptResources['resources.arsc'].length} bytes)`);
    console.log('[APK] Install: adb install -r dist/cryptobank.apk');
    console.log('[APK] Deep link test: adb shell am start -a android.intent.action.VIEW -d "cryptobank://wx-callback?challenge=test123"');
  } else {
    console.log('\n[APK] ⚠️  Build complete but WITHOUT binary manifest - APK will fail to install (INSTALL_PARSE_FAILED)');
    console.log('[APK] To fix, ensure aapt2 and android.jar are available in ~/.nitron/android/');
  }
}

buildAPK().catch(e => {
  console.error('[APK] Build failed:', e);
  process.exit(1);
});
