export type FeatureRequestStatus = 'requested' | 'in_progress' | 'shipped';

export interface FeatureRequestWithMeta {
  id: string;
  title: string;
  description?: string;
  status: FeatureRequestStatus;
  submitted_by_staff_id: string;
  submitted_by_org_id: string;
  created_at: string;
  updated_at: string;
  shipped_at?: string;
  vote_count: number;
  comment_count: number;
  has_voted: boolean;
  submitted_by_name: string;
  submitted_by_org_name: string;
}

export interface FeatureRequestComment {
  id: string;
  feature_request_id: string;
  staff_id: string;
  org_id: string;
  body: string;
  created_at: string;
  staff_name?: string;
  org_name?: string;
}

export interface FeatureRequestDetail {
  feature_request: FeatureRequestWithMeta;
  comments: FeatureRequestComment[];
}

export interface ToggleVoteResponse {
  has_voted: boolean;
  vote_count: number;
}
