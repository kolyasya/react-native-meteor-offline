import Meteor, { getData } from 'react-native-meteor';
import _ from 'lodash';

const meteorReduxReducers = (
  state = { reactNativeMeteorOfflineRecentlyAdded: [] },
  action
) => {
  const { type, collection, id, fields, cleared } = action;
  switch (type) {
    case 'SET_USERID': {
      return { ...state, userId: id };
    }

    case 'RECENTLY_ADDED': {
      return {
        ...state,
        reactNativeMeteorOfflineRecentlyAdded: [
          ...(state.reactNativeMeteorOfflineRecentlyAdded || []),
          id,
        ],
      };
    }

    case 'ADDED': {
      // If doc and/or collection don't exist yet, add them
      const existingDocument = _.get(state, `${collection}.${id}`, {});

      if (_.isEqual(existingDocument, fields)) {
        return state;
      }

      return {
        ...state,
        [collection]: { 
          ...state[collection], 
          [id]: fields 
        },
      };
    }

    case 'CHANGED': {
      // something's changed, add/update
      if (cleared.length) {
        const nextDoc = _.omit(state[collection][id], cleared);
        return { ...state, [collection]: { ...state[collection], [id]: nextDoc } };
      } else if (_.isEqual(_.get(state, `${collection}.${id}`), fields)) return state;
      return { ...state, [collection]: { ...state[collection], [id]: fields } };
    }

    case 'REMOVED':
      if (state[collection] && state[collection][id]) {
        const newState = _.clone(state);
        delete newState[collection][id];
        return newState;
      }
      // console.error(`Couldn't remove ${id}, not found in ${collection} collection`);
      return state;

    case 'SET_READY':
      // todo: check for removed docs
      return {
        ...state,
        ready: action.ready,
      };

    case 'REMOVE_AFTER_RECONNECT':
      // todo: check for removed docs
      const { removed } = action;
      const withoutRemoved = _.without(
        state.reactNativeMeteorOfflineRecentlyAdded,
        ...removed
      );
      if (getData().db[collection]) getData().db[collection].remove({ _id: { $in: removed } });
      return {
        ...state,
        reactNativeMeteorOfflineRecentlyAdded: withoutRemoved,
      };
    case 'persist/REHYDRATE':
      if (
        typeof Meteor.ddp === 'undefined' ||
        Meteor.ddp.status === 'disconnected'
      ) {
        return action.payload;
      }
      return state;
      
    case 'HARDRESET':
      console.log('hard reset');
      return {};
    default:
      return state;
  }
};

export default meteorReduxReducers;