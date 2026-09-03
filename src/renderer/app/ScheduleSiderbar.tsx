import { ButtonAdd } from "../components/ButtonAdd"
import { ButtonDelete } from "../components/ButtonDelete"
import { CardList } from "../components/CardList/CardList"

type Props = { onAdd: () => void }

export const ScheduleSidebar = ({ onAdd }: Props) => {
  return (
    <aside className="left-panel">
      <div className="left-header">
        <span className="title">时间表</span>
        <div className="header-actions">
          <ButtonAdd onAdd={onAdd} />
          <ButtonDelete />
        </div>
      </div>
      <CardList />
    </aside>
  )
}
