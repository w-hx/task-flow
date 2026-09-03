import { Fab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

type Props = { onAdd: () => void };

export const ButtonAdd = ({ onAdd }: Props) => { 
  return (
    <Fab
      color="primary" 
      aria-label="创建一个新的时间表" 
      title="创建一个新的时间表"
      size="small"
      id="btn-add"
      className="icon-btn"
      onClick={onAdd}
    >
      <AddIcon />
    </Fab>  
  )
}