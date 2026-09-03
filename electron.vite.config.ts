import { defineConfig } from 'electron-vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    }
  },

  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          tray: resolve(__dirname, 'src/preload/tray.ts')
        }
      }
    }
  },

  renderer: {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          tray: resolve(__dirname, 'src/renderer/tray.html')
        }
      }
    }
  }
})