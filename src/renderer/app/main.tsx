import { createRoot } from 'react-dom/client'
import { App } from './App'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('找不到 React 挂载节点 #root')
}

createRoot(rootElement).render(<App />)