import { defineConfig } from 'electron-vite'
import { resolve } from 'node:path'

export default defineConfig({
  main: {},

  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.js'),
          tray: resolve(__dirname, 'src/preload/tray.js')
        }
      }
    }
  },

  renderer: {
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