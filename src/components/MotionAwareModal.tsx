import { Modal, type ModalProps } from 'react-native';
import { useTheme } from '../theme/Theme';

export function MotionAwareModal({ animationType, ...props }: ModalProps) {
  const { reduceMotion } = useTheme();
  return <Modal {...props} animationType={reduceMotion ? 'none' : animationType} />;
}
