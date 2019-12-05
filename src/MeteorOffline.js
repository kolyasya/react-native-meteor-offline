import Meteor from 'react-native-meteor';
import { AsyncStorage } from 'react-native';
import _ from 'lodash';

export default class MeteorOffline {
  constructor(options = {}) {
    this.offline = true;

    this.subscriptions = [];
    this.collections = [];

    this.store = options.store;

    Meteor.waitDdpConnected(() => {
      this.offline = (Meteor.ddp.status === 'connected') ? false : true;
    });
  }

  subReady (uniqueName) {
    return this.subscriptions[uniqueName].ready && !this.offline;
  }

  user() {
    const user = Meteor.user();

    // If we have user loaded
    if (user) {
      this.store.dispatch({ type: 'SET_USER', payload: user });
      return user;
    }
    // Return user from cache
    const { METEOR_REDUX_REDUCERS: { RNMO_USER } } = this.store.getState();
    return RNMO_USER;
  }

  subscribe(uniqueName, name, ...params) {
    const hasCallback = typeof params[params.length - 1] === 'function';
    const justParams = params.slice(0, params.length - 1);

    _.set(this.subscriptions, `${uniqueName}.${name}`, name);
    _.set(
      this.subscriptions,
      `${uniqueName}.${params}`,
      JSON.stringify(justParams)
    );

    let subHandle = Meteor.subscribe(name, ...params);
    if (this.offline) {
      subHandle = {
        ready: () => {
          // ready === rehydrated
          return this.store.getState().ready || false;
        },
        offline: this.offline,
      };
    }
    // run callback if it's offline and ready for the first time
    if (
      this.offline &&
      hasCallback &&
      this.store.getState().ready &&
      !this.subscriptions[uniqueName].ready
    ) {
      // handled by meteor.subscribe if online
      const callback = _.once(params[params.length - 1]);
      callback();
    }
    this.subscriptions[uniqueName].ready = subHandle.ready();

    return subHandle;
  }

  collection(collection, subscriptionName) {
    // React-native-meteor clears MiniMongo collections on reconnect
    // https://github.com/inProgress-team/react-native-meteor/blob/master/src/Meteor.js#L97
    // Need to figure out way to handle this situations
    // console.log('RETURN COLLECTION', collection, subscriptionName, Meteor.collection(collection).find({}), Meteor.collection(collection));

    this.collections = _.uniq([...this.collections, collection]);
    return Meteor.collection(collection);
  }
}