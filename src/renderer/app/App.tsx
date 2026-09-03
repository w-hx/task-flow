import "./app.css"
import { useEffect, useState } from 'react'
import { ScheduleSidebar } from "./ScheduleSiderbar"
import { ScheduleWorkspace } from "./ScheduleWorkspace"
import { useRendererStore } from "./useRendererStore"

export const App = () => {
  const [panel, setPanel] = useState<'none' | 'create' | 'edit'>('none')
  const [booted, setBooted] = useState(false)

  const init = useRendererStore((s) => s.init)
  const activeId = useRendererStore((s) => s.activeId)
  const exitDeleteMode = useRendererStore((s) => s.exitDeleteMode)

  // 启动时加载数据（替代 renderer.js 的 loadData().then(...)）
  useEffect(() => {
    init().then(() => setBooted(true))
  }, [init])

  // activeId 变化 → 切到编辑面板（点卡片 / 新建成功都走这里）
  // 启动后无数据 → 显示创建面板；删除后右侧面板保持不变
  useEffect(() => {
    if (!booted) return
    if (activeId) setPanel('edit')
    else if (panel === 'none') setPanel('create')
  }, [booted, activeId])

  // 添加时间表
  const onAdd = () => {
    exitDeleteMode()
    setPanel('create')
  }

  return (
    <>
      <ScheduleSidebar onAdd={onAdd} />
      <ScheduleWorkspace panel={panel} />
    </>
  )
}
