export interface Group {
  id: string;
  name: string;
  type: string;
  is_permanent: boolean;
  comm_preference: string;
  created_at: string;
  updated_at: string;
  members?: GroupMembership[];
}

export interface GroupMembership {
  id: string;
  group_id: string;
  traveller_id: string;
  is_primary_coordinator: boolean;
  traveller_name?: string;
}
