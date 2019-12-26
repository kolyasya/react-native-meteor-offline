import Meteor from 'react-native-meteor';
import { batch } from 'react-redux'
import _ from 'lodash';

// Using queue to batch actions because sometimes DDP sends a lot of actions at the same time
let queue = [];
let DDPEventsRegistered = false;

const sync = _.debounce(store => {
  batch(() => {
    queue && queue.length && queue.map(a => store.dispatch(a));
  });
  // Clear queue on successful sync
  queue = [];
}, 500);


const registerDDPEvents = ({ store }) => {
  Meteor.ddp.on('connected', () => {
    store.dispatch({ type: 'SET_DDP_CONNECTED', payload: true });

    // Register events only for on a first connect
    if (!DDPEventsRegistered) {
      Meteor.ddp.on('disconnected', () => {
        store.dispatch({ type: 'SET_DDP_CONNECTED', payload: false });
      });
    
      Meteor.ddp.on('removed', ({ collection, id, fields = {} }) => {
        queue.push({ type: 'REMOVED', collection, id, fields });
        sync(store);
      });
    
      Meteor.ddp.on('changed', ({ collection, id, fields = {}, cleared = [] }) => {
        queue.push({ type: 'CHANGED', collection, id, fields, cleared });
        sync(store);
      });
    
      Meteor.ddp.on('added', ({ collection, id, fields = {} }, ...args) => {
        queue.push({ type: 'ADDED', collection, id, fields });
        sync(store);
      });

      DDPEventsRegistered = true;
    }
  });
}

export default registerDDPEvents;