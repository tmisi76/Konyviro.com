export interface BookShare {
  id: string;
  project_id: string;
  user_id: string;
  share_token: string;
  is_public: boolean;
  password_hash: string | null;
  view_mode: 'flipbook' | 'scroll';
  allow_download: boolean;
  expires_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBookShareInput {
  project_id: string;
  is_public: boolean;
  password?: string;
  view_mode: 'flipbook' | 'scroll';
  allow_download: boolean;
  expires_at?: string | null;
}

export interface UpdateBookShareInput {
  is_public?: boolean;
  password?: string | null;
  view_mode?: 'flipbook' | 'scroll';
  allow_download?: boolean;
  expires_at?: string | null;
}

export interface SharedBookData {
  project: {
    id: string;
    title: string;
    description: string | null;
    genre: string;
  };
  chapters: {
    id: string;
    title: string;
    content: string | null;
    sort_order: number;
    word_count: number;
  }[];
  share: BookShare;
}
