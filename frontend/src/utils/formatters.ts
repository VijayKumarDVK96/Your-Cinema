/**
 * Formats runtime in minutes to human readable hours and minutes format (e.g. 158 min -> "2h 38m")
 */
export const formatRuntime = (minutes?: number | null): string => {
  if (!minutes || minutes <= 0) return '';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs > 0 && mins > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (hrs > 0) {
    return `${hrs}h`;
  }
  return `${mins}m`;
};
