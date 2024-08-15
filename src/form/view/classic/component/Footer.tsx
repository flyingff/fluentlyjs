import { observer } from 'mobx-react-lite';
import { useClassicTodoListController } from '../controller';
import { Space, Spin } from 'antd';

const TodoListFooterView: React.FC = observer(() => {
  const controller = useClassicTodoListController();
  const list = controller.model.displayTodoList.value;
  return (
    <Spin spinning={controller.listLoading}>
      <Space direction="horizontal" size="large">
        <span>总数: {list.length}</span>
        <span>
          已完成: {list.reduce((n, x) => (x.completed ? n + 1 : n), 0)}
        </span>
        <span>
          未完成: {list.reduce((n, x) => (x.completed ? n : n + 1), 0)}
        </span>
      </Space>
    </Spin>
  );
});

export default TodoListFooterView;
