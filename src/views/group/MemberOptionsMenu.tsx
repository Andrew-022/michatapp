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
import { useTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../constants/theme';

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
  const { isDark } = useTheme();
  const currentTheme = isDark ? darkTheme : lightTheme;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.menuContainer, { backgroundColor: currentTheme.card }]}>
              <View style={[styles.header, { borderBottomColor: currentTheme.border }]}>
                <Text style={[styles.title, { color: currentTheme.text }]}>
                  Opciones para {memberName}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <MaterialIcons name="close" size={24} color={currentTheme.secondary} />
                </TouchableOpacity>
              </View>

              {!isAdmin ? (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onMakeAdmin();
                    onClose();
                  }}>
                  <MaterialIcons name="admin-panel-settings" size={24} color={currentTheme.primary} />
                  <Text style={[styles.optionText, { color: currentTheme.text }]}>
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
                  <MaterialIcons name="admin-panel-settings" size={24} color={currentTheme.secondary} />
                  <Text style={[styles.optionText, { color: currentTheme.secondary }]}>
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
                <MaterialIcons name="person-remove" size={24} color={currentTheme.error} />
                <Text style={[styles.optionText, { color: currentTheme.error }]}>
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
});

export default MemberOptionsMenu; 