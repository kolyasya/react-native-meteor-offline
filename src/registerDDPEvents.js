import Meteor from 'react-native-meteor';

let DDPEventsRegistered = false;

const registerDDPEvents = ({ store }) => {
  Meteor.ddp.on('connected', () => {
    store.dispatch({ type: 'SET_DDP_CONNECTED', payload: true });

    // Register events only for on a first connect
    if (!DDPEventsRegistered) {
      Meteor.ddp.on('disconnected', () => {
        store.dispatch({ type: 'SET_DDP_CONNECTED', payload: false });
      });
    
      Meteor.ddp.on('removed', ({ collection, id, fields = {} }) => {
        store.dispatch({ type: 'REMOVED', collection, id, fields });
      });
    
      Meteor.ddp.on('changed', ({ collection, id, fields = {}, cleared = [] }) => {
        store.dispatch({ type: 'CHANGED', collection, id, fields, cleared });
      });
    
      Meteor.ddp.on('added', ({ collection, id, fields = {} }, ...args) => {
        store.dispatch({ type: 'ADDED', collection, id, fields });  
      });

      DDPEventsRegistered = true;
    }
  });
}

export default registerDDPEvents;