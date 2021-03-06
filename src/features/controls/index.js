import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import styled from 'styled-components';

import {
  play,
  pause,
  nextTrack,
  prevTrack,
  setTrackTime,
  getPlayingStatus,
  getCurrentPlayer,
  getCurrentTrack,
  toggleMute,
  getMuteStatus,
} from '../player/player.ducks';

import { getShuffleStatus, toggleShuffle } from '../playlist/playlist.ducks';

// Components
import TrackTimeline from './TrackTimeline';

const propTypes = {
  play: PropTypes.func.isRequired,
  pause: PropTypes.func.isRequired,
  nextTrack: PropTypes.func.isRequired,
  prevTrack: PropTypes.func.isRequired,
  setTrackTime: PropTypes.func.isRequired,
  isPlaying: PropTypes.bool.isRequired,
  currentPlayer: PropTypes.object,
  currentTrack: PropTypes.object,
  shuffleEnabled: PropTypes.bool.isRequired,
  toggleShuffle: PropTypes.func.isRequired,
  toggleMute: PropTypes.func.isRequired,
  isMuted: PropTypes.bool.isRequired,
};

class ControlsContainer extends Component {
  state = {
    currentTime: 0,
    duration: 0,
  };

  componentWillMount() {
    this.timeUpdater = setInterval(this.updateTrackTimeline, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.timeUpdater);
  }

  componentWillReceiveProps(nextProps) {
    if (!this.props.isPlaying && nextProps.isPlaying) {
      // Start interval again when going from pause to play
      this.resetTimeUpdater();
    } else if (this.props.isPlaying && !nextProps.isPlaying) {
      // Clear interval when going from play to pause
      clearInterval(this.timeUpdater);
    }
  }

  resetTimeUpdater = () => {
    clearInterval(this.timeUpdater);
    this.timeUpdater = setInterval(this.updateTrackTimeline, 1000);
  }

  updateTrackTimeline = () => {
    try {
      const { isPlaying, currentPlayer } = this.props;

      // Only update timeline if track is playing
      if (isPlaying && !!currentPlayer) {      
        const currentTime = currentPlayer.getCurrentTime();
        const duration = currentPlayer.getDuration();

        this.setState({ currentTime, duration });

        const trackAlmostDone =
          (currentTime > 0 && duration > 0) &&
          (currentTime > (duration - 2));

        if (trackAlmostDone) this.props.nextTrack();
      }  
    } catch (error) {
      console.log('Could not update track time', error);
    }
  }

  setTrackTimeTmp = currentTime => {
    this.setState({ currentTime });
  }

  render() {
    const { isPlaying, currentTrack, shuffleEnabled, isMuted } = this.props;
    const { currentTime, duration } = this.state;

    return (
      <ControlsWrapper>
        <Controls>
          <ControlIcon
            className="mdi mdi-shuffle-variant"
            active={shuffleEnabled}
            onClick={() => this.props.toggleShuffle()}
            size="16px"
          />
          <ControlIcon
            className="mdi mdi-skip-previous"
            onClick={() => this.props.prevTrack()}
          />

          {isPlaying
            ? <ControlIcon
                className="mdi mdi-pause-circle-outline"
                onClick={() => this.props.pause()}
                size="40px"
              />
            : <ControlIcon
                className="mdi mdi-play-circle-outline"
                onClick={() => this.props.play()}
                size="40px"
              />}

          <ControlIcon
            className="mdi mdi-skip-next"
            onClick={() => this.props.nextTrack()}
          />
          <ControlIcon
            className={`mdi mdi-volume-${isMuted ? 'off' : 'high'}`}
            onClick={this.props.toggleMute}
            size="16px"
          />
        </Controls>

        {currentTrack &&
          <TrackTimeline
            currentTime={currentTime}
            duration={duration}
            handleTimeChange={this.props.setTrackTime}
            handleTimeSlide={this.setTrackTimeTmp}
          />}
      </ControlsWrapper>
    );
  }
}

const ControlsWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin: 8px 0px 4px 0px;
`;

const ControlIcon = styled.i`
  font-size: ${props => props.size || '24px'};
  color: ${props => props.active ? props.theme.primaryColorLight: '#fff'};
  margin: 0 16px;
  opacity: 0.6;
  transition: transform 0.2s ease, opacity 0.3s ease-in;

  &:hover {
    transform: scale(1.1);
    opacity: 1;
  }
`;

ControlsContainer.propTypes = propTypes;

function mapStateToProps(state) {
  return {
    isPlaying: getPlayingStatus(state),
    currentPlayer: getCurrentPlayer(state),
    currentTrack: getCurrentTrack(state),
    shuffleEnabled: getShuffleStatus(state),
    isMuted: getMuteStatus(state),
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      play,
      pause,
      nextTrack,
      prevTrack,
      setTrackTime,
      toggleShuffle,
      toggleMute,
    },
    dispatch
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(ControlsContainer);
