import { getData } from 'react-native-meteor';
import _ from 'lodash';

// Using this function just to enable/disable logging easily
const loggingEnabled = false;
const customLogging = (...args) => {
  if (loggingEnabled) { console.log(...args); }
}

const customDir = (...args) => {
  if (loggingEnabled) { console.log(JSON.stringify(...args, null, 2)); }
  
}

// This function takes data from redux-persist (which is connected to AsyncStorage)
// And restores it into MiniMongo

const restoreCollections = ({ store }) => {
  const persistStateReducers = store.getState().METEOR_REDUX_REDUCERS;

  customLogging('STARTING RESTORE')
  customLogging('METEOR_REDUX_REDUCERS:')
  // customDir(persistStateReducers);
  customLogging('');



  Object.keys(persistStateReducers).map(collectionName => {
    // if (collectionName !== 'users') return;

    customLogging('');
    customLogging('');
    customLogging('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    customLogging('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    customLogging('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    customLogging(collectionName);
    customLogging('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    customLogging('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    customLogging('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
    customLogging('');
    customLogging('');
    
    // We don't restore such collections because they are technical
    if (['RNMO_RESTORED', 'RNMO_RECENTLY_ADDED', 'RNMO_USER', 'RNMO_DDP_CONNECTED'].includes(collectionName)) {
      customLogging(`Collection ${collectionName} skipped`);
      return;
    }

    customLogging('RESTORRING COLLECTION', collectionName);

    const persistDocuments = persistStateReducers[collectionName];

    customLogging('Documents in persist state (AsyncStorage) collection:');
    customDir(persistDocuments);

    const persistDocumentsFixed = persistDocuments ? 
                                  Object.keys(persistDocuments).map(k => ({ ...persistDocuments[k], _id: k })) : 
                                  [];

    customLogging('Adding _ids to persist state documents:');
    customDir({ persistDocumentsFixed });

    // add the collection if it doesn't exist in MiniMongo yet
    if (!getData().db[collectionName]) {
      customLogging(`Collection ${collectionName} doesn't exist, adding to MiniMongo...`)
      // add collection to minimongo
      getData().db.addCollection(collectionName);
    }

    customLogging('ALREADY EXISTING DATA IN MINIMONGO COLLECTION');
    customDir(getData().db[collectionName]?.items)

    // I don't think that this code works correctly
    // We need to find a nice way to compare data
    // only upsert if the data doesn't match
    if (!_.isEqual(getData().db[collectionName]?.items, persistDocuments)) {
      customLogging(`Collection ${collectionName} are different, upserting...`)
      // add documents to collection
      getData().db[collectionName].upsert(persistDocumentsFixed);
    }
  });

  store.dispatch({ type: 'SET_RESTORED', payload: true });
}

export default restoreCollections;