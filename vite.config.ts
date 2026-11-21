import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

interface PosVersionManifest {
  version: string;
  editCount: number;
  updatedAt: string;
  lastSourceHash: string;
}

function collectSourceFiles(dir: string, ignoreNames: Set<string>): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name));
  const files: string[] = [];
  for (const entry of entries) {
    if (ignoreNames.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(full, ignoreNames));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function resolveAndBumpPosVersion(rootDir: string): PosVersionManifest {
  const versionPath = path.join(rootDir, 'src', 'posVersion.json');
  let current: PosVersionManifest = {
    version: '1.0.10',
    editCount: 10,
    updatedAt: new Date().toISOString(),
    lastSourceHash: '',
  };

  try {
    if (fs.existsSync(versionPath)) {
      const parsed = JSON.parse(fs.readFileSync(versionPath, 'utf8')) as Partial<PosVersionManifest>;
      if (typeof parsed.editCount === 'number' && parsed.editCount >= 1) {
        current = {
          version: String(parsed.version || `1.0.${parsed.editCount}`),
          editCount: parsed.editCount,
          updatedAt: String(parsed.updatedAt || current.updatedAt),
          lastSourceHash: String(parsed.lastSourceHash || ''),
        };
      }
    }
  } catch {
    // Keep default baseline if manifest cannot be parsed
  }

  const ignore = new Set(['node_modules', 'dist', '.git', '.aistudio', 'posVersion.json']);
  const candidateFiles = [
    ...collectSourceFiles(path.join(rootDir, 'src'), ignore),
    ...collectSourceFiles(path.join(rootDir, 'api'), ignore),
    ...collectSourceFiles(path.join(rootDir, 'lib'), ignore),
    path.join(rootDir, 'server.ts'),
    path.join(rootDir, 'firestore.rules'),
    path.join(rootDir, 'index.html'),
  ].filter((f) => fs.existsSync(f));

  const hash = crypto.createHash('sha256');
  for (const file of candidateFiles) {
    hash.update(path.relative(rootDir, file));
    hash.update('\0');
    hash.update(fs.readFileSync(file));
    hash.update('\0');
  }
  const sourceDigest = hash.digest('hex').slice(0, 24);

  if (sourceDigest && sourceDigest !== current.lastSourceHash) {
    const nextEditCount = current.editCount + 1;
    const nextManifest: PosVersionManifest = {
      version: `1.0.${nextEditCount}`,
      editCount: nextEditCount,
      updatedAt: new Date().toISOString(),
      lastSourceHash: sourceDigest,
    };
    try {
      fs.writeFileSync(versionPath, `${JSON.stringify(nextManifest, null, 2)}\n`, 'utf8');
    } catch {
      // Ignore write failures on read-only environments
    }
    return nextManifest;
  }

  return current;
}

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  const posMeta = isBuild ? resolveAndBumpPosVersion(__dirname) : null;
  return {
    plugins: [react(), tailwindcss()],
    ...(isBuild && posMeta
      ? {
          define: {
            __POS_APP_VERSION__: JSON.stringify(`v${posMeta.version}`),
            __POS_EDIT_COUNT__: JSON.stringify(posMeta.editCount),
          },
        }
      : {}),
    resolve: {
      dedupe: ['react', 'react-dom', 'motion'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      entries: ['index.html', 'src/main.tsx', 'src/App.tsx', 'src/components/*.tsx'],
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'motion/react',
        'lucide-react',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
      ],
    },
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')
            ) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) {
              return 'vendor-motion';
            }
            if (
              id.includes('node_modules/xlsx') ||
              id.includes('node_modules/cfb') ||
              id.includes('node_modules/ssf') ||
              id.includes('node_modules/codepage') ||
              id.includes('node_modules/jszip') ||
              id.includes('node_modules/wmf')
            ) {
              return 'vendor-xlsx';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-lucide';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
