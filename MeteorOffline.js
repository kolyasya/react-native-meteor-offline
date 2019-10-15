import Meteor from 'react-native-meteor';
import { AsyncStorage } from 'react-native';
import _ from 'lodash';
import { persistStore, autoRehydrate, createTransform } from 'redux-persist';

export default class MeteorOffline {
  constructor(options = {}) {
    this.offline = true;
    // first time connecting since app open or connection restored
    this.firstConnection = true;
    this.subscriptions = [];
    this.collections = [];
    this.store = options.store || initMeteorRedux(options.debugger || undefined, undefined, autoRehydrate());
    this.persistor = persistStore(
      this.store,
      {
        storage: AsyncStorage,
        debounce: options.debounce || 1000,
        blacklist: ['reactNativeMeteorOfflineRecentlyAdded'],
      },
      () => {
        this.store.loaded();
      }
    );
    console.log('initializing');
    Meteor.waitDdpConnected(() => {
      if (Meteor.ddp.status === 'connected') {
        this.offline = false;
      } else {
        this.offline = true;
        this.firstConnection = false;
      }
    });
  }

  subReady (uniqueName) {
    return this.subscriptions[uniqueName].ready && !this.offline;
  }

  user() {
    if (Meteor.user()) {
      this.store.dispatch({ type: 'SET_USERID', id: Meteor.userId() });
      return Meteor.user();
    }
    const { userId } = this.store.getState();
    return Meteor.collection('users').findOne(userId);
  }

  reset() {
    this.store.dispatch({ type: 'HARDRESET' });
    this.persistor.purge();
    //console.log('performed meteor offline hard reset');
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
    if (
      Meteor.status().connected &&
      this.firstConnection &&
      _.get(this.subscriptions, `${subscriptionName}.ready`)
    ) {
      this.firstConnection = false;
      const t = new Date();
      const recentlyAddedIds = this.store.getState()
        .reactNativeMeteorOfflineRecentlyAdded;
      const cachedIds = _.sortBy(_.keys(this.store.getState()[collection]));
      // console.log(`got cached in ${new Date() - t}ms`);
      const removed = _.sortBy(_.difference(cachedIds, recentlyAddedIds)) || [];
      // console.log(
      //   `got difference in ${new Date() - t}ms`,
      //   recentlyAddedIds,
      //   cachedIds,
      //   removed,
      //   this.store.getState().reactNativeMeteorOfflineRecentlyAdded
      // );
      this.store.dispatch({
        type: 'REMOVE_AFTER_RECONNECT',
        collection,
        removed,
      });
    }
    this.collections = _.uniq([...this.collections, collection]);
    return Meteor.collection(collection);
  }
}