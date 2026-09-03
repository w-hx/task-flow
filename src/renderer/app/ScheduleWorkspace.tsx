import { ScheduleForm } from './ScheduleForm'

type Props = { panel: 'none' | 'create' | 'edit' }

// 工作区：根据 panel 渲染创建或编辑表单（同一份 ScheduleForm，key 保证切换时重新挂载）。
// 表单的一切状态和逻辑都在 ScheduleForm 内部，这里只负责"显示哪个"。
export const ScheduleWorkspace: React.FC<Props> = ({ panel }) => {
  if (panel === 'none') {
    return <main className="right-panel" />
  }
  return (
    <main className="right-panel">
      <ScheduleForm key={panel} mode={panel} />
    </main>
  )
}
