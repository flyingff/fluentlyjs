import { Checkbox, Button, Empty, Table, Spin, Modal } from 'antd';
import { observer } from 'mobx-react-lite';
import { TodoListFormController, useTodoListController } from '../controller';
import { ColumnsType } from 'antd/es/table';
import { TodoItem } from '@/form/model/typings';
import dayjs from 'dayjs';
import { when } from 'mobx';

const CompleteCheckbox: React.FC<{
  item: TodoItem;
}> = observer(({ item }) => {
  const controller = useTodoListController();
  const { id, completed } = item;
  const togglingThis = controller.togglingItemId === id;

  const handleToggleItem = () => controller.toggleTodoItem(id, !completed);

  return (
    <Checkbox
      checked={completed}
      indeterminate={togglingThis}
      disabled={togglingThis}
      onChange={handleToggleItem}
    />
  );
});

const DeleteButton: React.FC<{
  item: TodoItem;
}> = observer(({ item }) => {
  const controller = useTodoListController();
  const { id } = item;
  const handleDeleteItem = () => {
    Modal.confirm({
      title: '确认删除',
      content: '确认删除这个待办事项吗？',
      okText: '要删除',
      cancelText: '算了',
      okButtonProps: {
        danger: true,
      },
      onOk: () => {
        controller.removeTodoItem(id);
        return when(() => !controller.model.deleteTodoItemAction.isRunning);
      },
    });
  };
  return (
    <Button type="link" danger onClick={handleDeleteItem}>
      删除
    </Button>
  );
});

const tableColumns: ColumnsType<TodoItem> = [
  {
    title: '状态',
    dataIndex: 'completed',
    width: 80,
    render: (_completed: boolean, item) => <CompleteCheckbox item={item} />,
  },
  {
    title: '标题',
    dataIndex: 'title',
  },
  {
    title: '截止日期',
    dataIndex: 'dueDate',
    width: 180,
    render: (dueDate?: number) =>
      dueDate ? dayjs(dueDate).format('YYYY-MM-DD HH:mm') : '-',
  },
  {
    title: '',
    width: 80,
    render: (_: unknown, item) => <DeleteButton item={item} />,
  },
];

const TodoListView: React.FC = observer(() => {
  const controller = useTodoListController();

  const list = controller.model.displayTodoList.value;
  return (
    <Table
      rowKey="id"
      dataSource={list}
      columns={tableColumns}
      loading={controller.listLoading}
      virtual
      scroll={{ x: 480, y: 240 }}
      style={{ minHeight: 300 }}
      pagination={false}
    />
  );
});

export default TodoListView;
