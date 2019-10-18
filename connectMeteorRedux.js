import Meteor, { getData } from 'react-native-meteor';
import { createStore, combineReducers } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import { AsyncStorage } from 'react-native';

import _ from 'lodash';
import EventEmitter from 'events';

import meteorReduxReducers from './meteorReduxReducers';
import MeteorOffline from './MeteorOffline';
import subscribeCached from './subscribeCached';
import returnCached from './returnCached';

const meteorReduxEmitter = new EventEmitter();

const initMeteorRedux = ({
  customReducers,
  preloadedState,
  enhancer,
}) => {

  console.log('INIT METEOR REDUX', {customReducers,
    preloadedState,
    enhancer, meteorReduxReducers});

  // Combine passed app reducers with our package reducers
  const combinedReducers = customReducers !== undefined
    ? combineReducers({ ...customReducers, METEOR_REDUX_REDUCERS: meteorReduxReducers })
    : meteorReduxReducers;

  const persistedReducer = persistReducer({
    key: 'root',
    storage: AsyncStorage,
    debounce: 1000,
    // whitelist: ['METEOR_REDUX_REDUCERS'],
  }, combinedReducers);

  console.log({ persistedReducer, enhancer })

  const store = createStore(
    persistedReducer,
    preloadedState,
    enhancer
  );

  persistor = persistStore(store);

  console.log(store, persistor);

  store.loaded = () => {
    console.log('Redux store is loaded');
    meteorReduxEmitter.emit('rehydrated');
  };

  meteorReduxEmitter.once('rehydrated', () => {
    // restore collections to minimongo

    console.log('')
    console.log('Starting restoring collections from Async Storage to Mini Mongo', store.getState())

    // Object.keys(store.getState().METEOR_REDUX_REDUCERS).map(collectionName => {

    //   console.log('collectionName', collectionName);

    //   const groundedCollection = store.getState().METEOR_REDUX_REDUCERS[collectionName];

    //   console.log('groundedCollection', groundedCollection);


    //   const correctedCollection = _.chain(groundedCollection)
    //     .map(doc => doc)
    //     .filter('_id')
    //     .value();

    //   console.log({ correctedCollection });

    //   // add the collection if it doesn't exist
    //   if (!getData().db[collectionName]) {
    //     console.log(`Collection ${collectionName} doesn't exist, adding to Mini Mongo...`)
    //     // add collection to minimongo
    //     getData().db.addCollection(collectionName);
    //   }

    //   // only upsert if the data doesn't match
    //   if (!_.isEqual(getData().db[collectionName], groundedCollection)) {
    //     console.log(`Collection ${collectionName} are different, upserting...`)
    //     // add documents to collection
    //     getData().db[collectionName].upsert(correctedCollection);
    //   }
    // });

    console.log('');
    console.log('');

    store.dispatch({ type: 'SET_READY', ready: true });
  });

  Meteor.waitDdpConnected(() => {
    let connected = true;
    
    Meteor.ddp.on('disconnected', () => {
      connected = false;
    });

    if (connected) {
      Meteor.ddp.on('removed', ({ collection, id, fields = {} }) => {
        store.dispatch({ type: 'REMOVED', collection, id, fields });
      });

      Meteor.ddp.on('changed', ({ collection, id, fields = {}, cleared = [] }) => {
        store.dispatch({ type: 'CHANGED', collection, id, fields, cleared });
      });

      Meteor.ddp.on('added', ({ collection, id, fields = {} }, ...args) => {
        store.dispatch({ type: 'ADDED', collection, id, fields });
        store.dispatch({ type: 'RECENTLY_ADDED', id });

        // const { collection, id } = obj;
        // const addedObject = { ...obj.fields, _id: id } || {};

        // const offlineCollection = store.getState()[METEOR_REDUX_REDUCERS][collection];
        // const existingObject = offlineCollection && offlineCollection[id];

        // if (!_.isEqual(addedObject, existingObject)) {
        //   store.dispatch({ type: 'ADDED', collection, id, fields: addedObject });
        // }

      });
    }
  });

  return { store, persistor };
};

export { meteorReduxReducers, subscribeCached, returnCached, MeteorOffline };
export default initMeteorRedux;
