export interface BlogPost {
  id: string;
  organisation_id: string;
  title: string;
  slug: string;
  body: string;
  excerpt?: string;
  featured_image_url?: string;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  published_at?: string;
  scheduled_at?: string;
  author_id?: string;
  category?: string;
  tags: string[];
  meta_title?: string;
  meta_description?: string;
  reading_time_minutes: number;
  allow_comments: boolean;
  is_featured: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  author_name?: string;
}
