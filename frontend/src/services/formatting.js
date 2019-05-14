import i18next from "i18next";

export function timeDifferenceInMinutes(latterEventTimestamp, formerEventTimestamp) {
  if (latterEventTimestamp == null && formerEventTimestamp != null) {
    return Number.POSITIVE_INFINITY;
  }

  if (latterEventTimestamp != null && formerEventTimestamp == null) {
    return Number.NEGATIVE_INFINITY;
  }

  return (latterEventTimestamp - formerEventTimestamp) / 1000 / 60;
}

export function prettyFormatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes - hours * 60;

  return (hours ? `${hours} h ` : "") + (minutes ? `${minutes} min` : "");
}

export function getMeetingSummary(meeting) {
  if (!meeting) return null;
  if (meeting.isPrivate) return i18next.t("meeting.private");
  return `${meeting.summary.substr(0, 5)}...` || i18next.t("meeting.no-title");
}