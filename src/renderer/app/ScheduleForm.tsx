import { useEffect, useState } from 'react'
import { Select, MenuItem, Button, Slider } from '@mui/material'
import { useRendererStore, type ScheduleInput } from './useRendererStore'
import { cnTimeRangeSpeak } from '../../domain/schedule/speak'

// 声音选项（同 renderer.js 的 <select> 选项）
const SOUND_OPTIONS = [
  { value: 'default', label: '默认 (Beep)' },
  { value: 'chime', label: 'Chime (风铃)' },
  { value: 'success', label: 'Success (成功)' },
  { value: 'alert', label: 'Alert (警告)' },
  { value: 'drop', label: 'Drop (下落)' },
  { value: 'rise', label: 'Rise (上升)' },
  { value: 'electronic', label: 'Electronic (电子)' },
  { value: 'magic', label: 'Magic (魔法)' },
  { value: 'doorbell', label: 'Doorbell (门铃)' },
  { value: 'zap', label: 'Zap (激光)' }
]

const DEFAULT_FORM: ScheduleInput = {
  name: '',
  content: '',
  soundStart: 'success',
  soundEnd: 'chime',
  speakVoice: '__none__',
  speakRate: 1
}

// 试听文本生成（对应 renderer.js 的 buildPreviewText）
function buildPreviewText(content: string): string {
  const firstLine = content.split('\n').map((l) => l.trim()).find((l) => l)
  let title = '示例任务'
  let startMin = 8 * 60
  let endMin = 8 * 60 + 30
  if (firstLine) {
    const m = firstLine.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})\s+(.+)$/)
    if (m) {
      startMin = parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
      endMin = parseInt(m[3], 10) * 60 + parseInt(m[4], 10)
      title = m[5].trim()
    } else {
      title = firstLine
    }
  }
  return cnTimeRangeSpeak(startMin, endMin) + '，' + title + '。'
}

type Props = { mode: 'create' | 'edit' }

// 创建/编辑共用的时间表表单。ScheduleWorkspace 按 panel 切换 mode 渲染（key 变化时重新挂载）。
// 表单值、错误信息都是本组件私有状态；保存走 store 的 createSchedule / updateSchedule。
export const ScheduleForm: React.FC<Props> = ({ mode }) => {
  const isEdit = mode === 'edit'

  const schedules = useRendererStore((s) => s.schedules)
  const activeId = useRendererStore((s) => s.activeId)
  const availableVoices = useRendererStore((s) => s.availableVoices)
  const runningId = useRendererStore((s) => s.runningId)
  const createSchedule = useRendererStore((s) => s.createSchedule)
  const updateSchedule = useRendererStore((s) => s.updateSchedule)
  const toggleRun = useRendererStore((s) => s.toggleRun)

  const [form, setForm] = useState<ScheduleInput>(DEFAULT_FORM)
  const [error, setError] = useState('')

  const isRunning = runningId === activeId
  const voiceList =
    availableVoices && availableVoices.zh.length > 0 ? availableVoices.zh : (availableVoices?.all ?? [])

  // 面板 mode / 选中卡片变化时初始化表单：
  // create 用默认值；edit 从 activeId 对应的时间表回填（编辑中切换卡片也会重新回填）
  useEffect(() => {
    if (!isEdit) {
      setForm({ ...DEFAULT_FORM })
      setError('')
      return
    }
    const s = schedules.find((x) => x.id === activeId)
    if (s) {
      setForm({
        name: s.name,
        content: s.items.map((it) => `${it.start}-${it.end} ${it.title}`).join('\n'),
        soundStart: s.soundStart,
        soundEnd: s.soundEnd,
        speakVoice: s.speakEnabled ? s.speakVoice : '__none__',
        speakRate: s.speakRate ?? 1
      })
      setError('')
    }
  }, [isEdit, activeId]) // 不含 schedules：保存后不重置表单

  const handleSave = async () => {
    const err = mode === 'create' ? await createSchedule(form) : await updateSchedule(form)
    setError(err ?? '')
  }

  const handlePreviewSpeak = () => {
    window.taskFlowAPI.previewSpeak({
      text: buildPreviewText(form.content),
      voiceName: form.speakVoice === '__none__' ? '' : form.speakVoice,
      rate: form.speakRate,
      volume: 1.0
    })
  }

  const handleSoundChange = (key: 'soundStart' | 'soundEnd') => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    window.taskFlowAPI.previewSound(value) // 同 renderer.js：切换即试听
  }

  const soundSelect = (value: string, onChange: (v: string) => void) => (
    <Select size="small" fullWidth value={value} onChange={(e) => onChange(e.target.value as string)}>
      {SOUND_OPTIONS.map((o) => (
        <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
      ))}
    </Select>
  )

  const voiceSelect = (value: string, onChange: (v: string) => void) => (
    <Select size="small" fullWidth value={value} onChange={(e) => onChange(e.target.value as string)}>
      <MenuItem value="__none__">无</MenuItem>
      <MenuItem value="">系统默认</MenuItem>
      {voiceList.map((v) => (
        <MenuItem key={v.name} value={v.name}>{v.name + (v.lang ? ` (${v.lang})` : '')}</MenuItem>
      ))}
    </Select>
  )

  const rateRow = (value: number, onChange: (v: number) => void) => (
    <div className="rate-row">
      <Slider
        min={0.5}
        max={2}
        step={0.1}
        value={value}
        marks
        onChange={(e, v) => onChange(Number(v))}
      />
      <Button variant="outlined" title="试听" color="primary" onClick={handlePreviewSpeak}>
        试听
      </Button>
    </div>
  )

  return (
    <div className="form-panel">
      <div className="form-row">
        <div className="form-group">
          <label>时间表名称</label>
          <input
            type="text"
            placeholder="输入时间表名称"
            maxLength={50}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="form-group small">
          <label>开始提示音</label>
          {soundSelect(form.soundStart, handleSoundChange('soundStart'))}
        </div>
        <div className="form-group small">
          <label>结束提示音</label>
          {soundSelect(form.soundEnd, handleSoundChange('soundEnd'))}
        </div>
      </div>
      <div className="form-row speak-config-row">
        <div className="form-group small">
          <label>语音朗读</label>
          {voiceSelect(form.speakVoice, (v) => setForm((f) => ({ ...f, speakVoice: v })))}
        </div>
        <div className="form-group rate-group">
          <label>语速 <span className="rate-value">{form.speakRate.toFixed(1)}x</span></label>
          {rateRow(form.speakRate, (v) => setForm((f) => ({ ...f, speakRate: v })))}
        </div>
      </div>
      <label>时间表内容</label>
      <textarea
        placeholder={
          isEdit
            ? '粘贴时间表'
            : '粘贴时间表，格式：\n7:30-7:35 起床拿水壶出去\n7:35-7:40 刷牙、烧水、洗脸'
        }
        value={form.content}
        onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
      />
      <div className="form-actions">
        {isEdit && (
          <Button
            variant="contained"
            color={isRunning ? 'error' : 'success'}
            onClick={() => toggleRun()}
          >
            {isRunning ? '停止运行' : '开始运行'}
          </Button>
        )}
        <Button variant="contained" color="primary" onClick={handleSave} disabled={isEdit && isRunning}>
          保存
        </Button>
      </div>
      <p className="error-msg">{error}</p>
    </div>
  )
}
