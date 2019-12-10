import Meteor from 'react-native-meteor';
import { getData } from 'react-native-meteor';
import _ from 'lodash';

export default class MeteorOffline {
  constructor(options = {}) {
    this.offline = true;

    this.subscriptions = [];
    this.collections = [];

    this.store = options.store;
    this.persistor = options.persistor;

    Meteor.waitDdpConnected(() => {
      this.offline = (Meteor.ddp.status === 'connected') ? false : true;
    });
  }

  reset() {
    // Clear persist cache
    if (this.persistor) this.persistor.purge();

    // Clear MiniMongo data
    const data = getData();
    if (data && data.db && data.db.collections) {
      // Go through all colelctions and clean up
      for (let collection in data.db.collections) {
        const currentCollection = data.db[collection];
        if (currentCollection && currentCollection.remove) currentCollection.remove({});
      }
    }
  }

  subReady (uniqueName) {
    return this.subscriptions[uniqueName].ready && !this.offline;
  }

  user() {
    const user = Meteor.user();
    const currentState = this.store.getState();
    const cachedUser = currentState && currentState.METEOR_REDUX_REDUCERS && currentState.RNMO_USER;

    // If we have user loaded
    // TODO: Maybe need to update user on time interval as well
    if (user && (!cachedUser || user._id !== cachedUser._id)) {
      this.store.dispatch({ type: 'SET_USER', payload: user });
      return user;
    }
    // Return user from cache
    return cachedUser;
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