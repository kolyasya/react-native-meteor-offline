import Meteor, { getData, Tracker } from 'react-native-meteor';
import { batch } from 'react-redux'
import _ from 'lodash';

// Using queue to batch actions because sometimes DDP sends a lot of actions at the same time
let queue = [];
let DDPEventsRegistered = false;

const loggingEnabled = true;
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

const cleanUpCollections = () => {
  console.log('Reconnected! Cleaning up collections...');
  // Cleaning up collections on reconnect
  const collectionsNames = Object.keys(getData().db.collections);
  collectionsNames?.map(cn => getData().db.collections[cn].remove({}));
  needToCleanUp = false;
}

const registerDDPEvents = ({ store }) => {
  console.log('Registering DDP events...');

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
        if (needToCleanUp) cleanUpCollections();
        queue.push({ type: 'REMOVED', collection, id, fields });
        sync(store);
      });
    
      Meteor.ddp.on('changed', ({ collection, id, fields = {}, cleared = [] }) => {
        customLogging('EVENT Changed');
        if (needToCleanUp) cleanUpCollections();
        queue.push({ type: 'CHANGED', collection, id, fields, cleared });
        sync(store);
      });
    
      Meteor.ddp.on('added', ({ collection, id, fields = {} }, ...args) => {
        customLogging('EVENT Added');
        if (needToCleanUp) cleanUpCollections();
        queue.push({ type: 'ADDED', collection, id, fields });
        sync(store);
      });
    });
  }
  console.log('Registering finished!');
}

export default registerDDPEvents;