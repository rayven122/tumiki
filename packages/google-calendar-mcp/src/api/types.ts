import type { JWTInput } from "google-auth-library";

export type AuthConfig =
  | {
      type: "service-account";
      credentials: JWTInput;
    }
  | {
      type: "oauth2";
      clientId: string;
      clientSecret: string;
      refreshToken: string;
    }
  | {
      type: "api-key";
      apiKey: string;
    }
  | {
      type: "adc";
    };

export type CalendarListEntry = {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  timeZone?: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  selected?: boolean;
  accessRole?: string;
  defaultReminders?: {
    method: string;
    minutes: number;
  }[];
  notificationSettings?: {
    notifications: {
      type: string;
      method: string;
    }[];
  };
  primary?: boolean;
  deleted?: boolean;
  hidden?: boolean;
};

export type CalendarEvent = {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  recurrence?: string[];
  attendees?: {
    email: string;
    displayName?: string;
    responseStatus?: "needsAction" | "declined" | "tentative" | "accepted";
    comment?: string;
    additionalGuests?: number;
    resource?: boolean;
  }[];
  reminders?: {
    useDefault?: boolean;
    overrides?: {
      method: string;
      minutes: number;
    }[];
  };
  visibility?: "default" | "public" | "private" | "confidential";
  status?: "confirmed" | "tentative" | "cancelled";
  transparency?: "opaque" | "transparent";
  colorId?: string;
  organizer?: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
  creator?: {
    email: string;
    displayName?: string;
    self?: boolean;
  };
  created?: string;
  updated?: string;
  htmlLink?: string;
  etag?: string;
  recurringEventId?: string;
  originalStartTime?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  privateCopy?: boolean;
  locked?: boolean;
  source?: {
    url: string;
    title: string;
  };
  attachments?: {
    fileUrl: string;
    title?: string;
    mimeType?: string;
    iconLink?: string;
    fileId?: string;
  }[];
  conferenceData?: {
    createRequest?: {
      requestId: string;
      conferenceSolutionKey: {
        type: string;
      };
      status?: {
        statusCode: string;
      };
    };
    entryPoints?: {
      entryPointType: string;
      uri?: string;
      label?: string;
      pin?: string;
      accessCode?: string;
      meetingCode?: string;
      passcode?: string;
      password?: string;
    }[];
    conferenceSolution?: {
      key: {
        type: string;
      };
      name?: string;
      iconUri?: string;
    };
    conferenceId?: string;
    signature?: string;
    notes?: string;
  };
};

export type FreeBusyRequest = {
  timeMin: string;
  timeMax: string;
  timeZone?: string;
  groupExpansionMax?: number;
  calendarExpansionMax?: number;
  items: {
    id: string;
  }[];
};

export type FreeBusyResponse = {
  timeMin: string;
  timeMax: string;
  calendars: Record<
    string,
    {
      busy: {
        start: string;
        end: string;
      }[];
      errors?: {
        domain: string;
        reason: string;
      }[];
    }
  >;
};

export type CalendarColors = {
  calendar: Record<
    string,
    {
      background: string;
      foreground: string;
    }
  >;
  event: Record<
    string,
    {
      background: string;
      foreground: string;
    }
  >;
};
