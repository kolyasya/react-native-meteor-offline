import Meteor from 'react-native-meteor';
import { createStore, combineReducers } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import { AsyncStorage } from 'react-native';

import meteorReduxReducers from './src/meteorReduxReducers';
import MeteorOffline from './src/MeteorOffline';
import subscribeCached from './src/subscribeCached';
import returnCached from './src/returnCached';
import restoreCollections from './src/restoreCollections';
import registerDDPEvents from './src/registerDDPEvents';

globalPersistor = '';
disconnect = () => {
  Meteor.disconnect();
}

reconnect = () => {
  Meteor.reconnect();
}

setTimeout(() => disconnect(), 1000);

const initMeteorRedux = ({
  customReducers,
  preloadedState,
  enhancer,
}) => {

  // Combine passed app reducers with our RNMO reducers
  const combinedReducers = customReducers !== undefined
    ? combineReducers({ ...customReducers, METEOR_REDUX_REDUCERS: meteorReduxReducers })
    : combineReducers({ METEOR_REDUX_REDUCERS: meteorReduxReducers });

  const persistedReducer = persistReducer({
    key: 'root',
    storage: AsyncStorage,
    debounce: 1000,
    // whitelist: ['METEOR_REDUX_REDUCERS'],
  }, combinedReducers);

  const store = createStore(
    persistedReducer,
    preloadedState,
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__(
      // enchacer
    ),
  );

  persistor = persistStore(store);

  // Temporary
  globalPersistor = persistor;

  // Figure out why do we have timeout here
  // Seems like there should be some kind of event listener
  setTimeout(() => restoreCollections({ store,  }), 300);

  registerDDPEvents({ store });

  return { store, persistor };
};

export { meteorReduxReducers, subscribeCached, returnCached, MeteorOffline };
export default initMeteorRedux;