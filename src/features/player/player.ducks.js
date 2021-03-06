import update from 'immutability-helper';
import { createAction } from 'redux-actions';
import { fork, takeEvery, takeLatest, select, put } from 'redux-saga/effects';
import { createTypes } from '../../common/reduxHelpers';
import {
  getNextTrack,
  getPrevTrack,
  getShuffleStatus,
  pushShuffledTrack,
  popShuffledTrack,
} from '../playlist/playlist.ducks';

// Action types
export const PLAYER = createTypes('PLAYER', [
  'PLAY', 'PAUSE', 'PREV_TRACK', 'NEXT_TRACK', 'SET_PLAYER', 'SET_TRACK',
  'SET_CURRENT_PLAYER', 'SET_TRACK_TIME', 'SET_CURRENT_TRACK', 'TOGGLE_MUTE'
]);

// Export actions
export const play = createAction(PLAYER.PLAY);
export const pause = createAction(PLAYER.PAUSE);
export const prevTrack = createAction(PLAYER.PREV_TRACK);
export const nextTrack = createAction(PLAYER.NEXT_TRACK);
export const setTrack = createAction(PLAYER.SET_TRACK);
export const setCurrentTrack = createAction(PLAYER.SET_CURRENT_TRACK);
export const setPlayer = createAction(PLAYER.SET_PLAYER);
export const setCurrentPlayer = createAction(PLAYER.SET_CURRENT_PLAYER);
export const setTrackTime = createAction(PLAYER.SET_TRACK_TIME);
export const toggleMute = createAction(PLAYER.TOGGLE_MUTE);

// Reducers
const initialState = {
  currentTrack: null,
  isPlaying: false,
  isMuted: false,
  players: {
    youtube: null,
    soundcloud: null,
  }
};

export default function reducer(state = initialState, action = {}) {
  switch (action.type) {
  case PLAYER.SET_PLAYER:
    return update(state, {
      players: { [action.payload.name]: { $set: action.payload.player } },
    });
  case PLAYER.PLAY:
    return update(state, {
      isPlaying: { $set: !!state.currentTrack},
    });
  case PLAYER.SET_CURRENT_TRACK:
    return update(state, {
      currentTrack: { $set: action.payload },
      isPlaying: { $set: true },
    });
  case PLAYER.PAUSE:
    return update(state, {
      isPlaying: { $set: false },
    });
  case PLAYER.TOGGLE_MUTE:
    return update(state, {
      isMuted: { $set: !state.isMuted },
    });
  default: return state;
  }
}


// Selectors
export const getPlayingStatus = ({ player }) => player.isPlaying;
export const getPlayerByName = (state, name) => state.player.players[name];
export const getCurrentTrack = ({ player }) => player.currentTrack;
export const getMuteStatus = ({ player }) => player.isMuted;
export const getCurrentPlayer = ({ player }) => {
  if (!player.currentTrack) return null;
  return player.players[player.currentTrack.track.type];
}


// Sagas handlers
function * setTrackSaga({ payload }) {
  try {
    const { track } = payload;

    // Reset current player if there's a track playing
    const currentPlayer = yield select(getCurrentPlayer);
    if (currentPlayer) currentPlayer.reset();

    // Re-dispatch the correct action that changes the store
    yield put(setCurrentTrack(payload));

    // Get the player for the new track
    const player = yield select(getPlayerByName, track.type);

    // Load and play the new track
    yield player.load(track);
    player.play();
  } catch (e) {
    console.debug('[setTrackSaga] error', e);
  }
}

function * playSaga() {
  try {
    const currentTrack = yield select(getCurrentTrack);
    if (!currentTrack) return; // early exit
    
    const trackType = currentTrack.track.type;
    const player = yield select(getPlayerByName, trackType);

    player.play();
  } catch (e) {
    console.debug('[playSaga] error', e);
  }
}

function * pauseSaga() {
  try {
    const currentTrack = yield select(getCurrentTrack);
    if (!currentTrack) return; // early exit

    const player = yield select(getPlayerByName, currentTrack.track.type);

    player.pause();
  } catch (e) {
    console.debug('[pauseSaga] error', e);
  }
}

function * nextTrackSaga() {
  try {
    const currentTrack = yield select(getCurrentTrack);
    if (!currentTrack) return; // early exit
    
    const nextTrack = yield select(getNextTrack, currentTrack);
    if (!nextTrack) return; // early exit

    // Push the track to the shuffle array
    const shuffleEnabled = yield select(getShuffleStatus);
    if (shuffleEnabled) yield put(pushShuffledTrack(nextTrack.id));

    yield put(setTrack({ ...currentTrack, track: nextTrack }));
  } catch (e) {
    console.debug('[nextTrackSaga] error', e);
  }
}

function * prevTrackSaga() {
  try {
    const currentTrack = yield select(getCurrentTrack);
    if (!currentTrack) return; // early exit

    const prevTrack = yield select(getPrevTrack, currentTrack);
    if (!prevTrack) return; // early exit

    // Every time we go back we remove last track from shuffled array
    // to keep the shuffle implementation simple.
    const shuffleEnabled = yield select(getShuffleStatus);
    if (shuffleEnabled) yield put(popShuffledTrack());

    yield put(setTrack({ ...currentTrack, track: prevTrack }));
  } catch (e) {
    console.debug('[nextTrackSaga] error', e);
  }
}

function * setTrackTimeSaga({ payload: newTime }) {
  try {
    const currentTrack = yield select(getCurrentTrack);
    if (!currentTrack) return; // early exit
    const player = yield select(getPlayerByName, currentTrack.track.type);

    player.seek(newTime);
  } catch (e) {
    console.debug('[pauseSaga] error', e);
  }
}

function * toggleMuteSaga() {
  try {
    const currentTrack = yield select(getCurrentTrack);
    if (!currentTrack) return; // early exit
    const player = yield select(getPlayerByName, currentTrack.track.type);
    const isMuted = yield select(getMuteStatus);

    // NOTE: this happens after the store has been updated!
    if (isMuted) player.mute();
    else player.unMute();
  } catch(e) {
    console.debug('[toggleMuteSaga] error', e);
  }
}

// Saga watchers
function * watchPlay() {
  yield takeEvery(PLAYER.PLAY, playSaga);
}
function * watchPause() {
  yield takeEvery(PLAYER.PAUSE, pauseSaga);
}
function * watchNextTrack() {
  yield takeEvery(PLAYER.NEXT_TRACK, nextTrackSaga);
}
function * watchPrevTrack() {
  yield takeEvery(PLAYER.PREV_TRACK, prevTrackSaga);
}
function * watchSetTrack() {
  yield takeEvery(PLAYER.SET_TRACK, setTrackSaga);
}
function * watchSetTrackTime() {
  yield takeLatest(PLAYER.SET_TRACK_TIME, setTrackTimeSaga);
}
function * watchMuteToggle() {
  yield takeLatest(PLAYER.TOGGLE_MUTE, toggleMuteSaga);
}

export function * playerSagas() {
  yield fork(watchPlay);
  yield fork(watchPause);
  yield fork(watchNextTrack);
  yield fork(watchPrevTrack);
  yield fork(watchSetTrack);
  yield fork(watchSetTrackTime);
  yield fork(watchMuteToggle);
}