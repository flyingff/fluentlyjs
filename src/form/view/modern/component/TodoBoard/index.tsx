import { observer } from 'mobx-react-lite';

import styles from './index.module.less';
import { useModernTodoListController } from '../../controller';
import dayjs from 'dayjs';
import { Checkbox } from 'antd';

const TodoBoard: React.FC = observer(() => {
  const controller = useModernTodoListController();
  const list = controller.model.displayTodoList.value;

  return (
    <div className={styles.tileGrid}>
      {list.map((item) => (
        <div key={item.id} className={styles.tile}>
          <Checkbox
            className={styles.checkbox}
            checked={item.completed}
            onClick={() => controller.toggleTodoItem(item.id, !item.completed)}
          />
          <div className={styles.title}>{item.title}</div>
          {item.dueDate ? (
            <div className={styles.deadline}>
              {dayjs(item.dueDate).format('YYYY-MM-DD HH:mm')}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
});

export default TodoBoard;
