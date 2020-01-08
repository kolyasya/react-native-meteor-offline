import Meteor from 'react-native-meteor';
import { getData } from 'react-native-meteor';
import _ from 'lodash';

export default class MeteorOffline {
  constructor(options = {}) {
    this.offline = true;

    this.subscriptions = {};
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

    this.store.dispatch({ type: 'RESET' });
  }

  subReady (uniqueName) {
    return this.subscriptions[uniqueName].ready && !this.offline;
  }

  user() {
    const user = Meteor.user();
    const currentState = this.store.getState();
    const cachedUser = currentState && currentState.METEOR_REDUX_REDUCERS && currentState.METEOR_REDUX_REDUCERS.RNMO_USER;

    // Return current user if connected, cached user if not, null in all other cases
    // TODO: Maybe need to update user on time interval as well
    if (user) {
      // If user has changed - cache it
      if (!_.isEqual(user, cachedUser)) {
        this.store.dispatch({ type: 'SET_USER', payload: user });
      } else {
        // console.log('Users are equal', user, cachedUser);
      }
      return user;
    } else if (cachedUser && cachedUser._id) {
      return {
        ...cachedUser,
        RNMO_CACHED: true,
      }
    } else 
      return null;
  }

  subscribe(uniqueName, name, ...params) {
    const createNewSubscription = (name, params) => {
      let subHandle;

      subHandle = Meteor.subscribe(name, ...params);

      if (this.offline) {
        subHandle = {
          ready: () => {
            return true;
          },
          offline: this.offline,
        };
      }

      this.subscriptions[uniqueName] = {
        name,
        params: JSON.stringify(justParams),
        handle: subHandle
      };

      console.log(this.subscriptions);

      return subHandle;
    }

    const hasCallback = typeof params[params.length - 1] === 'function';
    const justParams = hasCallback ? params.slice(0, params.length - 1) : params[0];

    const existingSub = this.subscriptions[uniqueName];

    if (existingSub && existingSub.name === name && existingSub.params === JSON.stringify(justParams)) {
      return existingSub.handle;
    } else {
      return createNewSubscription(name, params);
    }
  }

  deleteSubscription(uniqueName) {
    delete this.subscriptions[uniqueName];
  }

  unsubscribeAll({ whitelist = [] }) {
    if (!this.subscriptions) return;

    // Stop all subscriptions if they are not in a whitelist
    Object.keys(this.subscriptions).map(subscriptionName => {
      if (
        !whitelist.includes(subscriptionName) && 
        this.subscriptions[subscriptionName] && 
        this.subscriptions[subscriptionName].handle && 
        this.subscriptions[subscriptionName].handle.stop
      ) {
        this.subscriptions[subscriptionName].handle.stop();
        this.deleteSubscription(subscriptionName);
      }
    });
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