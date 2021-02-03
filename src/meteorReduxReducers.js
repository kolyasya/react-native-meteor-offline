import Meteor, { getData } from 'react-native-meteor';

import _ from 'lodash';

import packagePrivateReducers from './packagePrivateReducers';

const initialState = { 
  RNMO_RESTORED: false,
  RNMO_CLEANED_AFTER_RECONNECT: false,
  RNMO_USER: null,
  RNMO_DDP_CONNECTED: false,
  RNMO_SUBSCRIPTIONS: {},
  RNMO_RECENTLY_ADDED_DOCUMENTS: {},
  RNMO_RECENTLY_CLEANED_COLLECTIONS: {},
};

const meteorReduxReducers = (
  state = initialState,
  action
) => {
  const { type, collection, id, fields, cleared, payload } = action;

  // console.log({ type, state });

  switch (type) {
    // Cache user
    case 'SET_USER': {
      const newState = { ...state };
      if (action.payload && action.payload._id)
        newState.RNMO_USER = action.payload;

      return newState;
    }

    // We put documents after reconnect here to replace
    // existing documents with them
    case 'ADD_TO_RECENTLY_ADDED': {
      // console.log("ADD_TO_RECENTLY_ADDED", collection, fields, id);
      return {
        ...state,
        'RNMO_RECENTLY_ADDED_DOCUMENTS': {
          ...state['RNMO_RECENTLY_ADDED_DOCUMENTS'],
          [collection]: _.uniq([
            ...(state.RNMO_RECENTLY_ADDED_DOCUMENTS[collection] || []),
            id 
          ])
        }
      };
    }

    case 'CLEAN_RECENTLY_ADDED_FOR_COLLECTION': {
      if (collection) {
        const newRecentlyAdded = { ...state['RNMO_RECENTLY_ADDED_DOCUMENTS'] };
        delete newRecentlyAdded[collection];

        return {
          ...state,
          'RNMO_RECENTLY_ADDED_DOCUMENTS': newRecentlyAdded,
          'RNMO_RECENTLY_CLEANED_COLLECTIONS': {
            ...state['RNMO_RECENTLY_CLEANED_COLLECTIONS'],
            [collection]: true
          }
        };
      } else return state;      
    }
    

    case 'ADDED': {
      // console.log("ADDED", fields);
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
        return { 
          ...state, 
          [collection]: { ...state[collection], [id]: nextDoc } 
        };
      } else if (_.isEqual(_.get(state, `${collection}.${id}`), fields)) {
        return state;
      }
      return { 
        ...state, 
        [collection]: { ...state[collection], [id]: fields } 
      };
    }

    case 'REMOVED':
      if (state[collection] && state[collection][id]) {
        const newState = _.clone(state);
        delete newState[collection][id];
        return newState;
      }
      // console.error(`Couldn't remove ${id}, not found in ${collection} collection`);
      return state;

    case 'SET_RESTORED':
      return {
        ...state,
        RNMO_RESTORED: action.payload,
      };
      
    case 'persist/REHYDRATE':
      if (
        (typeof Meteor.ddp === 'undefined' ||
        Meteor.ddp.status === 'disconnected') &&
        action.payload &&
        action.payload.METEOR_REDUX_REDUCERS
      ) {
        return { ...action.payload.METEOR_REDUX_REDUCERS };
      }
      return state;
      
    case 'SET_DDP_CONNECTED': {
      let newState = {
        ...state,
        RNMO_DDP_CONNECTED: !!action.payload
      }

      // if get back online
      // we need to wipe all collections data
      if (!state.RNMO_DDP_CONNECTED && !!action.payload) {
        // console.log('WE ARE CONNECTED');
        // Clean up recently added documents on reconnect
        // console.log('Cleaning up Recently added');

        newState['RNMO_RECENTLY_ADDED_DOCUMENTS'] = { ...initialState.RNMO_RECENTLY_ADDED_DOCUMENTS };
        newState['RNMO_RECENTLY_CLEANED_COLLECTIONS'] = { ...initialState.RNMO_RECENTLY_CLEANED_COLLECTIONS };
        newState['RNMO_CLEANED_AFTER_RECONNECT'] = initialState.RNMO_CLEANED_AFTER_RECONNECT;
      }

      // On disconnect reset all subs status
      if (!action.payload) {
        newState.RNMO_SUBSCRIPTIONS = Object.keys(state.RNMO_SUBSCRIPTIONS).reduce((p, c) => ({
          ...p,
          [c]: { ...state.RNMO_SUBSCRIPTIONS[c], ready: false, cleaned: false }
        }), {});
      }

      return newState;
    }
      

    case 'RESET':
      return {
        ...initialState
      };

    case 'SET_SUBSCRIPTION': {
      const { payload } = action;
      const newState = { ...state };

      const newSubscriptionsState = {
        ...state.RNMO_SUBSCRIPTIONS,
      };

      // Preveting strange `undefined` subscriptions
      if (payload.name) {
        newSubscriptionsState[payload.name] = {
          ready: payload.ready
        }
      }

      // If we haven't clean up after reconnect yet
      if (!state.RNMO_CLEANED_AFTER_RECONNECT) {
        const notReadySubs = Object.keys(newSubscriptionsState).filter(k => !newSubscriptionsState[k].ready);

        if (notReadySubs.length === 0) {
          console.log('All subs are ready! Cleaning!');
          // The app will react on that change by cleaning up the collections
          newState.RNMO_CLEANED_AFTER_RECONNECT = true;
        }
      }

      newState.RNMO_SUBSCRIPTIONS = { ...newSubscriptionsState };
      return newState;
    }
    default:
      return state;
  }
};

export default meteorReduxReducers;