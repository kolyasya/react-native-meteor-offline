import { getData } from 'react-native-meteor';
import _ from 'lodash';

const restoreCollections = ({ store }) => {

  console.log('STARTING RESTORE')

  console.log(store.getState().METEOR_REDUX_REDUCERS);

  Object.keys(store.getState().METEOR_REDUX_REDUCERS).map(collectionName => {

    if (['ready', 'RNMO_RECENTLY_ADDED'].includes(collectionName)) return;

    console.log('');
    console.log('RESTORRING COLLECTION', collectionName);

    const persistDocuments = store.getState().METEOR_REDUX_REDUCERS[collectionName];

    console.log('groundedCollection', persistDocuments);

    const persistDocumentsFixed = Object.keys(persistDocuments).map(k => ({ ...persistDocuments[k], _id: k }));

    console.log({ persistDocumentsFixed });

    // add the collection if it doesn't exist
    if (!getData().db[collectionName]) {
      console.log(`Collection ${collectionName} doesn't exist, adding to Mini Mongo...`)
      // add collection to minimongo
      getData().db.addCollection(collectionName);
    }

    console.log('EXISTING DATA', getData().db[collectionName]);

    // only upsert if the data doesn't match
    if (!_.isEqual(getData().db[collectionName], persistDocuments)) {
      console.log(`Collection ${collectionName} are different, upserting...`)
      // add documents to collection
      getData().db[collectionName].upsert(persistDocumentsFixed);
    }
  });

  // Set ready to true so the app can use our GroundedPublication
  store.dispatch({ type: 'SET_READY', ready: true });
}

export default restoreCollections;