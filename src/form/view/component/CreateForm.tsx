import { Form, Input, DatePicker, Button, Modal } from 'antd';
import { observer } from 'mobx-react-lite';
import { useTodoListController } from '../controller';

const CreateFormView: React.FC = observer(() => {
  const controller = useTodoListController();

  return (
    <Form
      layout="vertical"
      onFinish={(values) =>
        controller.creatingForm.submitModal({
          dueDate: values.dueDate?.valueOf(),
          title: values.title,
        })
      }
      initialValues={controller.creatingForm.result ?? undefined}
    >
      <Form.Item
        label="标题"
        name="title"
        rules={[{ required: true, message: '请输入标题' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item label="截止日期" name="dueDate">
        <DatePicker
          picker="date"
          showTime
          allowClear
          style={{ width: '100%' }}
        />
      </Form.Item>
      <Form.Item style={{ textAlign: 'right' }}>
        <Button
          htmlType="submit"
          type="primary"
          loading={controller.creatingForm.submitting}
        >
          提交
        </Button>
      </Form.Item>
    </Form>
  );
});

const CreateFormModal: React.FC = observer(() => {
  const controller = useTodoListController();
  return (
    <Modal
      title="创建待办"
      open={controller.creatingForm.visible}
      footer={null}
      onCancel={() => {
        controller.creatingForm.closeModal();
      }}
      destroyOnClose
    >
      <CreateFormView />
    </Modal>
  );
});

export default CreateFormModal;
