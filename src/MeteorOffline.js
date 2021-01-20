import Meteor, { Tracker } from 'react-native-meteor';
import { getData } from 'react-native-meteor';
import _ from 'lodash';

import createNewSubscription from './createNewSubscription';

export default class MeteorOffline {
  constructor(options = {}) {
    this.subscriptions = {};
    this.collections = [];

    this.store = options.store;
    this.persistor = options.persistor;

    this.offline = true;
    Meteor.waitDdpConnected(() => {
      console.log('DDP CONNECTED');
      this.offline = (Meteor.ddp?.status === 'connected') ? false : true;
    });

    this.setUser = _.debounce(user => {
      this.store.dispatch({ type: 'SET_USER', payload: user });
    }, 500);

    this.store.subscribe(() => {
      const state = this.store.getState();
      const newOffline = !state.METEOR_REDUX_REDUCERS.RNMO_DDP_CONNECTED;
      // Updating offline status
      if (newOffline !== this.offline) {
        this.offline = newOffline;

        if (!this.offline) {

        }
      }
    })


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

  subReady(uniqueName) {
    return this.subscriptions[uniqueName].ready && !this.offline;
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
    // console.log('COLLECTION CALL', collection);

    const state = this.store.getState();

    // After reconnect we wait for documents to be added to collection from server
    // And clean up local cache
    // So we check if the collection was cleaned and has some documents to compare with

    if (
      !state.METEOR_REDUX_REDUCERS.RNMO_RECENTLY_CLEANED_COLLECTIONS?.[collection] && 
      state.METEOR_REDUX_REDUCERS.RNMO_RECENTLY_ADDED_DOCUMENTS?.[collection]?.length
    ) {
      const cachedDocumentsIds = Object.keys(state.METEOR_REDUX_REDUCERS[collection]);
      const addedDocumentsIds = state.METEOR_REDUX_REDUCERS.RNMO_RECENTLY_ADDED_DOCUMENTS?.[collection];
      const removedDocumentsIds = _.difference(cachedDocumentsIds, addedDocumentsIds);

      console.log({
        collection,
        cachedDocumentsIds,
        addedDocumentsIds,
        removedDocumentsIds
      });

      this.store.dispatch({
        type: 'CLEAN_RECENTLY_ADDED_FOR_COLLECTION',
        collection
      })
    }

    this.collections = _.uniq([...this.collections, collection]);
    return Meteor.collection(collection);
  }
}