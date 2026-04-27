export type RawSourceKind = "text" | "file" | "url";
export type RawSourceStatus = "pending" | "extracted" | "analyzed" | "failed";

export interface RawSource {
  id: string;
  project_id: string;
  user_id: string;
  source_kind: RawSourceKind;
  original_filename: string | null;
  storage_path: string | null;
  source_url: string | null;
  title: string | null;
  extracted_text: string | null;
  word_count: number;
  topic_cluster: string | null;
  status: RawSourceStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}