import { Form, Row, Col, Radio, DatePicker, Button } from 'antd';
import { observer } from 'mobx-react-lite';
import { useClassicTodoListController } from '../controller';

const TodoListFilterView: React.FC = observer(() => {
  const controller = useClassicTodoListController();
  return (
    <Form
      layout="vertical"
      onFinish={() => controller.applyFilter()}
      onValuesChange={(_changedValues, allValues) => {
        controller.displayFilter.updatePartial({
          completed: allValues.completed,
          dueDate: allValues.dueDate?.valueOf(),
        });
      }}
    >
      <Row>
        <Col span={10}>
          <Form.Item label="完成状态" name="completed">
            <Radio.Group>
              <Radio value={undefined}>全部</Radio>
              <Radio value={true}>已完成</Radio>
              <Radio value={false}>未完成</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col span={10}>
          <Form.Item label="在此日期前需要完成" name="dueDate">
            <DatePicker picker="date" showTime allowClear />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item style={{ textAlign: 'right' }}>
            <Button
              htmlType="submit"
              type="primary"
              disabled={controller.listLoading}
            >
              筛选
            </Button>
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
});

export default TodoListFilterView;
