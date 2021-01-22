import Meteor, { Tracker } from 'react-native-meteor';
import { getData } from 'react-native-meteor';
import _ from 'lodash';

import createNewSubscription from './createNewSubscription';
import cleanupCollectionsAfterReconnect from './cleanupCollectionsAfterReconnect';
import cleanupDirtySubscriptions from './cleanupDirtySubscriptions';

export default class MeteorOffline {
  constructor(options = {}) {
    this.subscriptions = {};
    this.collections = [];

    this.store = options.store;
    this.persistor = options.persistor;

    this.setUser = _.debounce(user => {
      this.store.dispatch({ type: 'SET_USER', payload: user });
    }, 500);

    this.previousRecentlyAddedLength = -1;
    
    this.connected = false;
    this.store.subscribe(() => {
      const state = this.store.getState();
      const newConnected = state.METEOR_REDUX_REDUCERS.RNMO_DDP_CONNECTED;

      if (newConnected) {
        // Don't use this one for now, because we need to define relations
        // between collections and subscriptions
        // cleanupDirtySubscriptions(this, { state });
      }

      // Updating offline status
      if (newConnected !== this.connected) {
        this.connected = newConnected;

        // On reconnect we cleanup local collections
        // This is needed because after reconnect Meteor sends only Added
        // events. It means that if something was removed on a server
        // we don't know about it
        console.log('Starting cleanup...');
        cleanupCollectionsAfterReconnect(this);
      }
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

  user() {
    const user = Meteor.user();
    const state = this.store.getState();
    const cachedUser = state?.METEOR_REDUX_REDUCERS?.RNMO_USER;
    // Return current user if connected, cached user if not, null in all other cases
    // TODO: Maybe need to update user on time interval as well
    if (user) {
      // If user has changed - cache it
      if (!_.isEqual(user, cachedUser)) {
        this.setUser(user);
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
    // If the last param is a function
    const hasCallback = typeof params[params.length - 1] === 'function';
    const subscriptionParams = hasCallback ? params.slice(0, params.length - 1) : params[0];

    const existingSub = this.subscriptions[uniqueName];
    const cacheHit =
      existingSub &&
      existingSub.name === name &&
      existingSub.params === JSON.stringify(subscriptionParams)

    if (cacheHit) {
      // Updating existing timestamp
      if (existingSub.handle) {
        Tracker.autorun(() => {
          existingSub.handle.lastRequestedAt = new Date();
        });
      }
      return existingSub.handle;
    } else {
      return createNewSubscription(this, uniqueName, name, subscriptionParams);
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
    this.collections = _.uniq([...this.collections, collection]);
    return Meteor.collection(collection);
  }
}