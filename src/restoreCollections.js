import { getData } from 'react-native-meteor';

// store.dispatch({ type: 'SET_READY', ready: true });

const restoreCollections = ({ store }) => {

  console.log('STARTING RESTORE')

  console.log(store.getState().METEOR_REDUX_REDUCERS);

  Object.keys(store.getState().METEOR_REDUX_REDUCERS).map(collectionName => {

    console.log('collectionName', collectionName);

    const groundedCollection = store.getState().METEOR_REDUX_REDUCERS[collectionName];

    console.log('groundedCollection', groundedCollection);

    return;

    const correctedCollection = _.chain(groundedCollection)
      .map(doc => doc)
      .filter('_id')
      .value();

    console.log({ correctedCollection });

    // add the collection if it doesn't exist
    if (!getData().db[collectionName]) {
      console.log(`Collection ${collectionName} doesn't exist, adding to Mini Mongo...`)
      // add collection to minimongo
      getData().db.addCollection(collectionName);
    }

    // only upsert if the data doesn't match
    if (!_.isEqual(getData().db[collectionName], groundedCollection)) {
      console.log(`Collection ${collectionName} are different, upserting...`)
      // add documents to collection
      getData().db[collectionName].upsert(correctedCollection);
    }
  });
}

export default restoreCollections;