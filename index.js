/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Si no necesitas opciones personalizadas, Firebase se inicializa automáticamente
AppRegistry.registerComponent(appName, () => App);

