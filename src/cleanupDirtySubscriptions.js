import { getData } from 'react-native-meteor';

const cleanupDirtySubscriptions = (self, { state }) => {
  if (!self) return;

  const dirtySubscriptions = Object.keys(state.METEOR_REDUX_REDUCERS.RNMO_SUBSCRIPTIONS).filter(s => {
    const sub = state.METEOR_REDUX_REDUCERS.RNMO_SUBSCRIPTIONS[s];
    return sub.ready && !sub.cleaned;
  });

  if (!dirtySubscriptions?.length) return;
  
  dirtySubscriptions.map(subName => {
    // We assume that collection name is the same as sub name
    const collectionToClean = getData().db.collections[subName];
    if (collectionToClean) {
      if (!state.METEOR_REDUX_REDUCERS.RNMO_RECENTLY_CLEANED_COLLECTIONS[subName]) {
        const newData = state.METEOR_REDUX_REDUCERS.RNMO_RECENTLY_ADDED_DOCUMENTS[subName];
        
        // If we didn't get any added items for collection just wipe it
        if (!newData?.length) {
          // console.log('Wipe', subName);
          collectionToClean.remove({});
        } 
        // If we have something — filter all other items out from a collection
        else {
          // console.log('Filter', subName, newData);
          collectionToClean.remove({_id: { $nin: newData }});
        };

        // Clean up recently added for a collection and mark it as cleaned
        self.store.dispatch({
          type: 'CLEAN_RECENTLY_ADDED_FOR_COLLECTION',
          collection: subName
        });
      }
    }
  });
};

export default cleanupDirtySubscriptions;