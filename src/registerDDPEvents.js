import Meteor from 'react-native-meteor';

const registerDDPEvents = ({ store }) => {
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
      });
    }
  });
}

export default registerDDPEvents;