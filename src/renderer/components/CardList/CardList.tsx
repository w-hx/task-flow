import { useRendererStore } from '../../app/useRendererStore'

// 渲染时间表卡片列表（对应旧 renderer.js 的 renderCards）
export const CardList = () => {
  const schedules = useRendererStore((s) => s.schedules)
  const activeId = useRendererStore((s) => s.activeId)
  const runningId = useRendererStore((s) => s.runningId)
  const deleteMode = useRendererStore((s) => s.deleteMode)
  const selectSchedule = useRendererStore((s) => s.selectSchedule)
  const deleteSchedule = useRendererStore((s) => s.deleteSchedule)

  // 按 updatedAt 倒序（同 renderer.js renderCards）
  const sorted = [...schedules].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))

  return (
    <div className={'card-list' + (deleteMode ? ' delete-mode' : '')}>
      {sorted.map((s) => {
        const isRunning = s.id === runningId
        // 运行中或被点开的时间表不显示删除按钮（同 renderer.js 的 canDelete 规则）
        const canDelete = !isRunning && s.id !== activeId
        const cardClass =
          'schedule-card' +
          (s.id === activeId ? ' active' : '') +
          (isRunning ? ' running' : '')

        return (
          <div
            key={s.id}
            id={s.id}
            className={cardClass}
            onClick={() => {
              if (!deleteMode) selectSchedule(s.id)
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)' }}
            onMouseUp={(e) => { e.currentTarget.style.transform = '' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = '' }}
          >
            {canDelete ? (
              <button
                className="card-delete-btn"
                data-id={s.id}
                title="删除"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteSchedule(s.id)
                }}
              >
                −
              </button>
            ) : (
              <span className="card-delete-placeholder"></span>
            )}
            <span className="card-name">{s.name}</span>
            {isRunning && <span className="running-indicator-icon">🟢</span>}
          </div>
        )
      })}
    </div>
  )
}
