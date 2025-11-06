import ReactGA from "react-ga4";

export function initGoogleAnalytics(trackingId: string | undefined): void {
  trackingId && ReactGA.initialize(trackingId);
}
