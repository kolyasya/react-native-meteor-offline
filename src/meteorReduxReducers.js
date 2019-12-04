import Meteor, { getData } from 'react-native-meteor';
import _ from 'lodash';

const initialState = { 
  RNMO_USER: null,
};

const meteorReduxReducers = (
  state = initialState,
  action
) => {
  const { type, collection, id, fields, cleared, payload } = action;

  switch (type) {

    // Cache user
    case 'SET_USER': {
      return {
        ...state,
        RNMO_USER: payload,
      };
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

    case 'SET_READY':
      // todo: check for removed docs
      return {
        ...state,
        ready: action.ready,
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
      
    case 'HARDRESET':
      return {};

    default:
      return state;
  }
};

export default meteorReduxReducers;