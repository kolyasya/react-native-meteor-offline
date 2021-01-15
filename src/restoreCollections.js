import { getData } from 'react-native-meteor';
import _ from 'lodash';

import packagePrivateReducers from './packagePrivateReducers';

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
  console.log('Restoring collections from redux persist...');

  const persistStateReducers = store.getState().METEOR_REDUX_REDUCERS;

  customLogging('STARTING RESTORE')
  customLogging('METEOR_REDUX_REDUCERS:')
  // customDir(persistStateReducers);
  customLogging('');

  Object.keys(persistStateReducers).map(collectionName => {
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
    if (packagePrivateReducers.includes(collectionName)) {
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

    // Pick documents that are already in MiniMongo
    // It means that we downloaded them already from server
    const miniMongoDocuments = getData().db[collectionName]?.find();
    customLogging('ALREADY EXISTING DATA IN MINIMONGO COLLECTION');
    customLogging(miniMongoDocuments);

    // Comparing documents in persist storage 
    // with documents in MiniMongo just by _id
    const persistDocumentsToRestore = [];
    persistDocumentsFixed?.map(pd => {
      if (pd._id && !miniMongoDocuments.find(md => md._id === pd._id)) {
        persistDocumentsToRestore.push(pd);
      }
    });

    customLogging('DOCUMENTS TO RESTORE FROM PERSIST STORAGE');
    customLogging(persistDocumentsToRestore);
  
    // If we have something to restore — do it
    if (persistDocumentsToRestore?.length) {
      getData().db[collectionName].upsert(persistDocumentsToRestore);
    }
  });

  store.dispatch({ type: 'SET_RESTORED', payload: true });
  console.log('Restoring finished!');
}

export default restoreCollections;