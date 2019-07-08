import React from "react";
import i18next from "i18next";
import { connect } from "react-redux";
import { Time } from "theme/index";
import styled from "styled-components/macro";
import colors from "dark/colors";
import EventAvailable from "react-icons/lib/md/event-available";
import AccountBox from "react-icons/lib/md/account-box";
import {
  currentMeetingSelector,
  isAmPmClockSelector,
  minutesAvailableTillNextMeetingSelector,
  nextMeetingSelector
} from "apps/device/store/selectors";
import { getMeetingSummary, prettyFormatMinutes } from "services/formatting";

const Wrapper = styled.div`
  color: ${colors.foreground.gray};
  padding: 0.4rem 1.2rem;
`;

const Indent = styled.div`
  text-indent: -1.5rem;
  margin-left: 1.5rem;
  
  :after {
    display: block;
    content: '';
  }
`;

function firstLetterUpperCase(str) {
  return str.substr(0, 1).toUpperCase() + str.substr(1);
}

const CurrentMeeting = ({ currentMeeting, nextMeeting, minutesToNextMeeting, isAmPmClock }) => {
  const getTitle = () => {
    if (!currentMeeting && !nextMeeting) {
      return i18next.t("availability.available-all-day");
    }

    if (!currentMeeting && nextMeeting) {
      return i18next.t("availability.available-for", { time: prettyFormatMinutes(minutesToNextMeeting) });
    }

    return (
      <>
        {getMeetingSummary(currentMeeting)}
        {" "}
        {!currentMeeting.isAllDayEvent &&
        <span style={{ whitespace: "nowrap", display: "inline-block", textIndent: 0 }}>
          {<Time timestamp={currentMeeting.startTimestamp} ampm={isAmPmClock}/>}
          {" – "}
          {<Time timestamp={currentMeeting.endTimestamp} ampm={isAmPmClock}/>}
        </span>}
      </>
    );
  };

  let externalGuests = false;
  const guests = currentMeeting && !currentMeeting.isPrivate && currentMeeting.attendees.map((u) => {
    // internal
    if(u.displayName.endsWith('@akarion.com') && u.displayName.includes('.')) {
      const name = u.displayName.split('@')[0].split('.');
      return `${firstLetterUpperCase(name[0])} ${firstLetterUpperCase(name[1])}`
    }
    // external guests
    if(u.displayName.includes('@')) {
      if(externalGuests) {
        return null;
      }
      externalGuests = true;
      return 'External Guests';
    }
    // the meeting room itself
    if(u.displayName.startsWith('Akarion ')) {
      return null;
    }
    return u.displayName;
  }).filter(u => !!u);
  
  // filter(u => u.displayName !== currentMeeting.organizer.displayName);

  return (
    <Wrapper>
      <Indent>
        <EventAvailable style={{ color: colors.foreground.white, verticalAlign: "middle", width: "1.5rem" }}/>
        <span style={{ verticalAlign: "middle" }}>{getTitle()}</span>
      </Indent>
      {currentMeeting && !currentMeeting.isPrivate && <Indent>
        <AccountBox style={{ color: colors.foreground.white, verticalAlign: "middle", width: "1.5rem" }}/>
        <span style={{ verticalAlign: "middle" }}>
          {guests.length > 0 && guests.length <= 5 && (", " + guests.join(", "))}
          {guests.length > 0 && guests.length > 5 && (" " + i18next.t("meeting.guests", { count: guests.length }))}
        </span>
      </Indent>}
    </Wrapper>
  );
};

const mapStateToProps = state => ({
  currentMeeting: currentMeetingSelector(state),
  nextMeeting: nextMeetingSelector(state),
  minutesToNextMeeting: minutesAvailableTillNextMeetingSelector(state),
  isAmPmClock: isAmPmClockSelector(state)
});

export default connect(mapStateToProps)(CurrentMeeting);
