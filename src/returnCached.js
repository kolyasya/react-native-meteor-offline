import Meteor from 'react-native-meteor';

const returnCached = (cursor, store, collection, doDisable) => {
  console.warn('returnCached is deprecated and will be removed soon');
  if (Meteor.ddp && Meteor.ddp.status === 'disconnected') {
    return store.getState()[collection] || [];
  }
  return cursor;
};