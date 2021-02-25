import Meteor, { Tracker } from 'react-native-meteor';

const createNewSubscription = (self, uniqueName, name, params) => {
  let subHandle;

  // Remove subscription with the same name
  if (self.subscriptions[uniqueName]) {
    self.subscriptions[uniqueName].handle.stop();
  }

  subHandle = Meteor.subscribe(name, ...params, (result) => {
    self.store.dispatch({ type: 'SET_SUBSCRIPTION', payload: {
      name,
      ready: true
    } });
  });

  // Adding timestamps for logging in the App
  if (subHandle) {
    subHandle.createdAt = new Date();
    Tracker.autorun(() => {
      // console.log(uniqueName, name, subHandle.ready());
      subHandle.lastRequestedAt = new Date();
    });
  }

  self.subscriptions[uniqueName] = {
    name,
    params: JSON.stringify(params),
    handle: subHandle
  };

  return subHandle;
};

export default createNewSubscription;