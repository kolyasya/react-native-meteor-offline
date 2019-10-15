import Meteor, { getData } from 'react-native-meteor';
import { createStore, combineReducers } from 'redux';

import _ from 'lodash';
import EventEmitter from 'events';

import meteorReduxReducers from './meteorReduxReducers';
import MeteorOffline from './MeteorOffline';
import subscribeCached from './subscribeCached';
import returnCached from './returnCached';

const meteorReduxEmitter = new EventEmitter();

const initMeteorRedux = (
  customDebugger = undefined,
  preloadedState = undefined,
  enhancer = undefined,
  customReducers = undefined
) => {
  // console.log(preloadedState, enhancer)
  const newReducers = customReducers !== undefined
    ? combineReducers({ ...customReducers, meteorReduxReducers })
    : meteorReduxReducers;
  const MeteorStore = createStore(
    newReducers,
    customDebugger,
    preloadedState,
    enhancer
  );

  MeteorStore.loaded = () => {
    meteorReduxEmitter.emit('rehydrated');
  };

  meteorReduxEmitter.once('rehydrated', () => {
    // restore collections to minimongo
    _.each(MeteorStore.getState(), (collection, key) => {
      const correctedCollection = _.chain(collection)
        .map((doc) => doc)
        .filter('_id')
        .value();
      // add the collection if it doesn't exist
      if (!getData().db[key]) {
        // add collection to minimongo
        getData().db.addCollection(key);
      }
      // only upsert if the data doesn't match
      if (!_.isEqual(getData().db[key], collection)) {
        // add documents to collection
        getData().db[key].upsert(correctedCollection);
      }
    });
    MeteorStore.dispatch({ type: 'SET_READY', ready: true });
  });

  Meteor.waitDdpConnected(() => {
    // return false;
    // question: do I need to check for disconnection?
    let connected = true;
    Meteor.ddp.on('disconnected', () => {
      connected = false;
    });
    if (connected) {
      Meteor.ddp.on('removed', ({ collection, id, fields = {} }) => {
        MeteorStore.dispatch({ type: 'REMOVED', collection, id, fields });
      });
      Meteor.ddp.on('changed', ({ collection, id, fields = {}, cleared = [] }) => {
        MeteorStore.dispatch({ type: 'CHANGED', collection, id, fields, cleared });
      });
      Meteor.ddp.on('added', (obj, ...args) => {
        const { collection, id } = obj;
        // console.log('added', obj, args);
        const fields = obj.fields || {};
        fields._id = id;
        const getCollection = MeteorStore.getState()[collection];
        if (
          !getCollection ||
          !getCollection[id] ||
          !_.isEqual(getCollection[id], fields)
        ) {
          // don't insert if it exists
          MeteorStore.dispatch({ type: 'ADDED', collection, id, fields });
        }
        MeteorStore.dispatch({ type: 'RECENTLY_ADDED', id });
      });
    }
  });

  return MeteorStore;
};







export { meteorReduxReducers, subscribeCached, returnCached, MeteorOffline };
export default initMeteorRedux;
