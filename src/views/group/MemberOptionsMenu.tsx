import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { globalStyles } from '../../styles/globalStyles';

interface MemberOptionsMenuProps {
  visible: boolean;
  onClose: () => void;
  onMakeAdmin: () => void;
  onRemoveAdmin: () => void;
  onRemove: () => void;
  memberName: string;
  isAdmin: boolean;
}

const MemberOptionsMenu = ({
  visible,
  onClose,
  onMakeAdmin,
  onRemoveAdmin,
  onRemove,
  memberName,
  isAdmin,
}: MemberOptionsMenuProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.menuContainer}>
              <View style={styles.header}>
                <Text style={[styles.title, globalStyles.text]}>
                  Opciones para {memberName}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {!isAdmin ? (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onMakeAdmin();
                    onClose();
                  }}>
                  <MaterialIcons name="admin-panel-settings" size={24} color="#007AFF" />
                  <Text style={[styles.optionText, globalStyles.text]}>
                    Hacer administrador
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onRemoveAdmin();
                    onClose();
                  }}>
                  <MaterialIcons name="admin-panel-settings" size={24} color="#FF9500" />
                  <Text style={[styles.optionText, styles.removeAdminText]}>
                    Quitar administrador
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.option, styles.removeOption]}
                onPress={() => {
                  onRemove();
                  onClose();
                }}>
                <MaterialIcons name="person-remove" size={24} color="#FF3B30" />
                <Text style={[styles.optionText, styles.removeText]}>
                  Eliminar del grupo
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: Dimensions.get('window').width * 0.85,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 12,
  },
  removeOption: {
    marginTop: 8,
  },
  removeText: {
    color: '#FF3B30',
  },
  removeAdminText: {
    color: '#FF9500',
  },
});

export default MemberOptionsMenu; 