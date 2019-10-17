import Meteor, { getData } from 'react-native-meteor';
import { createStore, combineReducers } from 'redux';

import _ from 'lodash';
import EventEmitter from 'events';

import meteorReduxReducers from './meteorReduxReducers';
import MeteorOffline from './MeteorOffline';
import subscribeCached from './subscribeCached';
import returnCached from './returnCached';

const meteorReduxEmitter = new EventEmitter();

const METEOR_REDUX_REDUCERS = 'METEOR_REDUX_REDUCERS';

const initMeteorRedux = (
  customDebugger = undefined,
  preloadedState = undefined,
  enhancer = undefined,
  customReducers = undefined
) => {

  // Combine passed app reducers with our package reducers
  const combinedReducers = customReducers !== undefined
    ? combineReducers({ ...customReducers, [METEOR_REDUX_REDUCERS]: meteorReduxReducers })
    : meteorReduxReducers;

  const store = createStore(
    combinedReducers,
    customDebugger,
    preloadedState,
    enhancer
  );

  store.loaded = () => {
    console.log('Redux store is loaded');
    meteorReduxEmitter.emit('rehydrated');
  };

  meteorReduxEmitter.once('rehydrated', () => {
    // restore collections to minimongo

    // _.each(store.getState()[METEOR_REDUX_REDUCERS], (collection, key) => {
    //   const correctedCollection = _.chain(collection)
    //     .map((doc) => doc)
    //     .filter('_id')
    //     .value();

    //   console.log({ correctedCollection });

    //   // add the collection if it doesn't exist
    //   if (!getData().db[key]) {
    //     // add collection to minimongo
    //     getData().db.addCollection(key);
    //   }

    //   // only upsert if the data doesn't match
    //   if (!_.isEqual(getData().db[key], collection)) {
    //     // add documents to collection
    //     getData().db[key].upsert(correctedCollection);
    //   }

    // });

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

  return store;
};

export { meteorReduxReducers, subscribeCached, returnCached, MeteorOffline };
export default initMeteorRedux;
