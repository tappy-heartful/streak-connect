export interface ReserveGroup {
  groupName: string;
  companions: string[];
  reservationNo?: string;
}

export interface TicketData {
  id?: string;
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
  liveData?: any;
}

