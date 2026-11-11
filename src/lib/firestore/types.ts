/**
 * Firestore データモデル型定義 (Streak Connect)
 */

export interface ConnectUser {
  id?: string;
  displayName?: string;
  pictureUrl?: string;
  agreedAt?: any;
  status?: string;
  lastLoginAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface Live {
  id: string;
  title: string;
  date: string; // yyyy.MM.dd
  venue: string;
  open?: string;
  start?: string;
  advance?: number;
  door?: number;
  flyerUrl?: string;
  ticketStock?: number;
  totalReserved?: number;
  isAcceptReserve?: boolean;
  acceptStartDate?: string;
  acceptEndDate?: string;
  maxCompanions?: number;
  note?: string;
  caution?: string;
  setlist?: {
    setName?: string;
    songIds?: string[];
    [key: string]: any;
  }[];
  createdAt?: any;
  updatedAt?: any;
}

export interface ReserveGroup {
  groupName: string;
  companions: string[];
  reservationNo?: string;
}

export interface Ticket {
  id: string;
  liveId: string;
  uid: string;
  resType: "invite" | "general";
  reservationNo?: string;
  representativeName: string;
  companions: string[];
  totalCount?: number;
  groups?: ReserveGroup[];
  createdAt?: any;
  updatedAt?: any;
  liveData?: Live | null;
}

export interface Media {
  id: string;
  title: string;
  date: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  driveUrl?: string;
  isDispTop?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface Score {
  id: string;
  title: string;
  referenceTrack?: string;
  youtubeId?: string;
  [key: string]: any;
}

export interface EnqueteQuestion {
  id: string;
  title: string;
  type: "rating" | "boolean" | "text" | "textarea" | "select";
  required?: boolean;
  options?: string[];
}

export interface EnqueteAnswer {
  id?: string;
  liveId: string;
  uid?: string;
  common: Record<string, any>;
  submittedAt?: any;
}

export interface ConnectLog {
  id?: string;
  uid: string;
  action: string;
  dataId?: string;
  status: "success" | "error";
  errorDetail?: any;
  createdAt?: any;
}

