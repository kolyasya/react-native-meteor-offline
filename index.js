import Meteor from 'react-native-meteor';
import { createStore, combineReducers } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-community/async-storage';

import meteorReduxReducers from './src/meteorReduxReducers';
import MeteorOffline from './src/MeteorOffline';
import subscribeCached from './src/subscribeCached';
import restoreCollections from './src/restoreCollections';
import registerDDPEvents from './src/registerDDPEvents';

// >>>>>>>>>>>>>> Functions for development
globalPersistor = '';
disconnect = () => {
  Meteor.disconnect();
}

reconnect = () => {
  Meteor.reconnect();
}
// setTimeout(() => disconnect(), 0);
// <<<<<<<<<<<<<<

const initMeteorRedux = ({
  customReducers,
  preloadedState,
  enhancer,
}) => {
  // Combine app's reducers with our RNMO reducers
  const combinedReducers = customReducers !== undefined
    ? combineReducers({ ...customReducers, METEOR_REDUX_REDUCERS: meteorReduxReducers })
    : combineReducers({ METEOR_REDUX_REDUCERS: meteorReduxReducers });

  const persistedReducer = persistReducer({
    timeout: 0,
    key: 'root',
    storage: AsyncStorage,
    debounce: 1000,
    whitelist: ['METEOR_REDUX_REDUCERS'],
  }, combinedReducers);

  const store = createStore(
    persistedReducer,
    preloadedState,
    enhancer
  );

  persistor = persistStore(store);

  // Temporary for development
  globalPersistor = persistor;

  // Once persist finished rehydration (restoring data from AsyncStorage to redux)
  // run restoring to MiniMongo and register DDP events
  let previousRehydrated = store.getState()._persist.rehydrated;
  const usubscribeRehydrated = store.subscribe(() => {
    const rehydrated = store.getState()._persist.rehydrated;
    if (!previousRehydrated && rehydrated) {
      previousRehydrated = rehydrated;
      restoreCollections({ store });
      registerDDPEvents({ store });

      // Once we restored everything, we don't need to listen to rehydrated anymore.
      usubscribeRehydrated();
    }
  });

  return { store, persistor };
};

export { meteorReduxReducers, subscribeCached, MeteorOffline };
export default initMeteorRedux;
