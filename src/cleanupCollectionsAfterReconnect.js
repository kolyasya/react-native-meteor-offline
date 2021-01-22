import { getData } from 'react-native-meteor';

// An idea of this function is to wait until RNMO_RECENTLY_ADDED_DOCUMENTS
// length stops changing (it means that we got all data)
// After that we cleanup or filter local collections to exclude data which
// they shouldn't contain

const cleanupCollectionsAfterReconnect = (self) => {
  if (!self) return;

  const state = self.store.getState();
  const newRecentlyAddedLength = JSON.stringify(state.METEOR_REDUX_REDUCERS.RNMO_RECENTLY_ADDED_DOCUMENTS).length;

  console.log('Recently added comparision', self.previousRecentlyAddedLength, newRecentlyAddedLength);

  // If we are still getting data postpone cleanup for 3000 ms
  if (newRecentlyAddedLength !== self.previousRecentlyAddedLength) {
    console.log('Postpone cleanup for 3000 ms');
    self.previousRecentlyAddedLength = newRecentlyAddedLength;
    setTimeout(() => cleanupCollectionsAfterReconnect(self), 3000);
  } 
  // Actual clean up
  else {
      console.log('Actual cleanup');
      const state = self.store.getState();
      const collectionsNames = Object.keys(getData().db.collections);

      collectionsNames?.map(cn => {
        if (!state.METEOR_REDUX_REDUCERS.RNMO_RECENTLY_CLEANED_COLLECTIONS[cn]) {
          const newData = state.METEOR_REDUX_REDUCERS.RNMO_RECENTLY_ADDED_DOCUMENTS[cn];
          
          // If we didn't get any added items for collection just wipe it
          if (!newData?.length) {
            console.log('Wipe', cn);
            getData().db.collections[cn].remove({});
          } 
          // If we have something — filter all other items out from a collection
          else {
            console.log('Filter', cn, newData);
            getData().db.collections[cn].remove({_id: { $nin: newData }});
          };

          // Clean up recently added for a collection and mark it as cleaned
          self.store.dispatch({
            type: 'CLEAN_RECENTLY_ADDED_FOR_COLLECTION',
            cn
          });
        }
      });
    }
  };

  export default cleanupCollectionsAfterReconnect;