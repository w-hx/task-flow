import { Fab } from '@mui/material';
import DeleteIcon from '@mui/icons-material/delete';
import { Done } from '@mui/icons-material';
import { useRendererStore } from '../app/useRendererStore';

export const ButtonDelete: React.FC = () => {
  const deleteMode = useRendererStore((s) => s.deleteMode)
  const toggleDeleteMode = useRendererStore((s) => s.toggleDeleteMode)
  return (
    <Fab
      size="small"
      aria-label="删除时间表"
      title="删除时间表"
      id="btn-delete-mode"
      className="icon-btn"
      onClick={toggleDeleteMode}
    >
      {deleteMode ? <Done color="success" /> : <DeleteIcon />}
    </Fab>
  )
}