import update from 'immutability-helper';
import { createAction } from 'redux-actions';
import { fork, takeEvery, put } from 'redux-saga/effects';
import { createTypes } from '../common/reduxHelpers';
import { listPlaylists as listPlaylistsDB } from '../services/db';
import { receivePlaylists } from '../features/playlist/playlist.ducks';
import { receiveTracks } from '../features/track/track.ducks';

// Action types
export const INIT = createTypes('INIT', [
  'START', 'END',
]);

// Export actions
export const initApp = createAction(INIT.START);
export const initDone = createAction(INIT.END);

// Reducers
const initialState = {
  initDone: false,
};

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
  case INIT.END:
    return update(state, {
      initDone: { $set: true },
    });
  default: return state;
  }
}

// Selectors
export const getInitStatus = state => state.init.initDone;


// Sagas handlers
function * initAppSaga() {
  const playlists = yield listPlaylistsDB();
  const tracksById = {};
  const playlistsById = {};

  // Fill mappers with playlist and tracks data
  playlists.forEach(p => {
    playlistsById[p._id] = { ...p, tracks: p.tracks.map(t => t.id) };

    p.tracks.forEach(t => {
      if (!tracksById[t.id]) tracksById[t.id] = t;
    });
  });

  yield put(receivePlaylists(playlistsById));
  yield put(receiveTracks(tracksById));
  yield put(initDone());
}


// Saga watchers
function * watchInit() {
  yield takeEvery(INIT.START, initAppSaga);
}

export function * initSagas() {
  yield fork(watchInit);
}