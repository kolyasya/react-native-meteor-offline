import Meteor from 'react-native-meteor';

const subscribeCached = (store, name, ...args) => {
  let offline = true;
  const subHandle = Meteor.subscribe(name, ...args);
  Meteor.waitDdpConnected(() => {
    if (Meteor.ddp.status === 'connected') {
      offline = false;
    }
  });
  if (!store || !offline) return subHandle;
  if (typeof args[args.length - 1] === 'function' && store.getState().ready) {
    const callback = _.once(args[args.length - 1]);
    callback();
  }
  return {
    ready: () => {
      return store.getState().ready || false;
    },
    offline: true,
  };
};

export default subscribeCached;