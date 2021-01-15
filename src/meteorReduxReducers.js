import Meteor, { getData } from 'react-native-meteor';

import _ from 'lodash';

import packagePrivateReducers from './packagePrivateReducers';

const initialState = { 
  RNMO_RESTORED: false,
  RNMO_USER: null,
  RNMO_DDP_CONNECTED: false,
  RNMO_SUBSCRIPTIONS: {},
};

const meteorReduxReducers = (
  state = initialState,
  action
) => {
  const { type, collection, id, fields, cleared, payload } = action;

  switch (type) {
    // Cache user
    case 'SET_USER': {
      const newState = { ...state };
      if (payload && payload._id)
        newState.RNMO_USER = payload;
      return newState;
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
        // _.difference(Object.keys(newState), packagePrivateReducers).map(r => {
        //   const collectionToRemove = getData().db.collections[r];
        //   if (collectionToRemove) {
        //     console.log('Removing items from', r);
        //     collectionToRemove.remove({});
        //   }
        //   return state[r] = [];
        // });
      }

      return newState;
    }
      

    case 'RESET':
      return {
        ...initialState
      };

    case 'SET_SUBSCRIPTION':
      const { payload } = action;
      return {
        ...state,
        RNMO_SUBSCRIPTIONS: {
          ...state.RNMO_SUBSCRIPTIONS,
          [payload.name]: {
            ready: payload.ready
          }
        }
      };

    default:
      return state;
  }
};

export default meteorReduxReducers;