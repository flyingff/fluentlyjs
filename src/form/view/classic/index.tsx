import React, { useState } from 'react';
import {
  ClassicTodoListFormController,
  ClassicTodoListFormControllerProvider,
} from './controller';

import styles from './index.module.less';
import { Button, Card, Space } from 'antd';
import { observer } from 'mobx-react-lite';
import CreateFormModal from './component/CreateForm';
import TodoListFilterView from './component/TodoFilter';
import TodoListView from './component/TodoList';
import TodoListFooterView from './component/Footer';

const TodoListOverall: React.FC = () => {
  const [controller] = useState(() => new ClassicTodoListFormController());

  // 视图包含以下内容：
  // 1. 一个用于显示待办事项列表的区域，每一个待办事项都有一个复选框，一个标题，一个描述，一个截止日期，一个checkbox用于标记是否完成，一个按钮用于删除
  // 2. 一个用于创建待办事项的表单
  // 3. 一个用于筛选待办事项的表单
  // 4. 一个用于显示待办事项列表的统计信息的footer

  return (
    <ClassicTodoListFormControllerProvider value={controller}>
      <div className={styles.wrapper}>
        <Card
          title="待办列表"
          bordered={false}
          extra={
            <Space direction="horizontal" size="small">
              <Button
                onClick={() => controller.creatingForm.openModal()}
                type="primary"
              >
                创建待办
              </Button>
              <Button onClick={() => controller.refreshTodoList()}>刷新</Button>
            </Space>
          }
        >
          <TodoListFilterView />
        </Card>

        <Card bordered={false}>
          <TodoListView />
        </Card>
        <Card bordered={false} className={styles.footer}>
          <TodoListFooterView />
        </Card>

        <CreateFormModal />
      </div>
    </ClassicTodoListFormControllerProvider>
  );
};

export default observer(TodoListOverall);
