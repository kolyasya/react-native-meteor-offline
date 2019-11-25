import { getData } from 'react-native-meteor';

const restoreCollections = ({ store }) => {
  Object.keys(store.getState().METEOR_REDUX_REDUCERS).map(collectionName => {

    console.log('collectionName', collectionName);

    const groundedCollection = store.getState().METEOR_REDUX_REDUCERS[collectionName];

    console.log('groundedCollection', groundedCollection);


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