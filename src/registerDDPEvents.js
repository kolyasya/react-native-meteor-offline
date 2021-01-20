import Meteor, { getData, Tracker } from 'react-native-meteor';
import { batch } from 'react-redux'
import _ from 'lodash';

// Using queue to batch actions because sometimes DDP sends a lot of actions at the same time
let queue = [];
let DDPEventsRegistered = false;

const loggingEnabled = false;
const customLogging = (...args) => {
  if (loggingEnabled) { console.log(...args); }
}

const sync = _.debounce(store => {
  batch(() => {
    queue && queue.length && queue.map(a => store.dispatch(a));
  });
  // Clear queue on successful sync
  queue = [];
}, 500);

let needToCleanUp = false;

const cleanUpCollections = ({ store }) => {
  return; 
  customLogging('Reconnected! Cleaning up collections...');
  store.dispatch({ type: 'SET_DDP_CONNECTED', payload: true }); 
  // Cleaning up collections on reconnect
  const collectionsNames = Object.keys(getData().db.collections);
  collectionsNames?.map(cn => getData().db.collections[cn].remove({}));
  needToCleanUp = false;
}

const registerDDPEvents = ({ store }) => {
  customLogging('Registering DDP events...');

  // Register events only for on a first connect
  // Don't know why connected only gets fired once
  // Have to update connection state in any other events as well
  if (!DDPEventsRegistered && Meteor.ddp) {
    Meteor.ddp.on('connected', () => {
      customLogging('EVENT Connected');
      store.dispatch({ type: 'SET_DDP_CONNECTED', payload: true });  
      DDPEventsRegistered = true;

      Meteor.ddp.on('disconnected', () => {
        customLogging('EVENT Disconnected');
        needToCleanUp = true;
        store.dispatch({ type: 'SET_DDP_CONNECTED', payload: false });
      });
    
      Meteor.ddp.on('removed', ({ collection, id, fields = {} }) => {
        customLogging('EVENT Removed');
        if (needToCleanUp) cleanUpCollections({ store });
        queue.push({ type: 'REMOVED', collection, id, fields });
        sync(store);
      });
    
      Meteor.ddp.on('changed', ({ collection, id, fields = {}, cleared = [] }) => {
        customLogging('EVENT Changed');
        if (needToCleanUp) cleanUpCollections({ store });
        queue.push({ type: 'CHANGED', collection, id, fields, cleared });
        sync(store);
      });
    
      Meteor.ddp.on('added', ({ collection, id, fields = {} }, ...args) => {
        customLogging('EVENT Added');
        if (!store.getState().METEOR_REDUX_REDUCERS.RNMO_DDP_CONNECTED) {
          store.dispatch({ type: 'SET_DDP_CONNECTED', payload: true }); 
        }
        if (needToCleanUp) {
          cleanUpCollections({ store });
        }
        queue.push({ type: 'ADDED', collection, id, fields });
        queue.push({ type: 'ADD_TO_RECENTLY_ADDED', collection, id, fields });
        sync(store);
      });
    });
  }
  customLogging('Registering finished!');
}

export default registerDDPEvents;