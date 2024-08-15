import { observer } from 'mobx-react-lite';

import styles from './index.module.less';
import { PlusOutlined } from '@ant-design/icons';

const CreatePage: React.FC = observer(() => {
  return (
    <>
      <div className={styles.fab}>
        <PlusOutlined />
      </div>
    </>
  );
});

export default CreatePage;
