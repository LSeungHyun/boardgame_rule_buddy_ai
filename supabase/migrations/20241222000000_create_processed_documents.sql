-- Create processed_documents table for storing PDF processing results
CREATE TABLE IF NOT EXISTS processed_documents (
    id BIGSERIAL PRIMARY KEY,
    source_pdf_path TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    image_descriptions JSONB DEFAULT '{}',
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_processed_documents_source_pdf_path 
ON processed_documents(source_pdf_path);

CREATE INDEX IF NOT EXISTS idx_processed_documents_processed_at 
ON processed_documents(processed_at DESC);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE processed_documents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read processed documents
CREATE POLICY "Allow authenticated users to read processed documents" 
ON processed_documents FOR SELECT 
TO authenticated 
USING (true);

-- Allow service role to insert/update/delete
CREATE POLICY "Allow service role full access to processed documents" 
ON processed_documents FOR ALL 
TO service_role 
USING (true);

-- Create function to automatically trigger rulebook processor
-- This function will be called when a PDF is uploaded to the rule-pdf bucket
CREATE OR REPLACE FUNCTION notify_rulebook_processor()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process PDF files in the rule-pdf bucket
  IF NEW.bucket_id = 'rule-pdf' AND LOWER(NEW.name) LIKE '%.pdf' THEN
    -- Call the edge function using pg_net extension
    -- Note: Replace 'your-project-ref' with your actual Supabase project reference
    PERFORM
      net.http_post(
        url := 'https://your-project-ref.supabase.co/functions/v1/rulebook-processor',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true)
        ),
        body := jsonb_build_object(
          'type', 'INSERT',
          'table', 'objects',
          'record', row_to_json(NEW),
          'schema', 'storage'
        )
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on storage.objects table
DROP TRIGGER IF EXISTS rulebook_processor_trigger ON storage.objects;
CREATE TRIGGER rulebook_processor_trigger
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION notify_rulebook_processor();

-- Create rule-pdf bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('rule-pdf', 'rule-pdf', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for rule-pdf bucket
CREATE POLICY "Allow authenticated users to upload PDFs" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'rule-pdf' AND LOWER(name) LIKE '%.pdf');

CREATE POLICY "Allow public read access to PDFs" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'rule-pdf');

CREATE POLICY "Allow authenticated users to delete their PDFs" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'rule-pdf' AND owner = auth.uid());

-- Comment explaining the setup
COMMENT ON TABLE processed_documents IS 'Stores processed PDF documents with extracted markdown content and image descriptions';
COMMENT ON COLUMN processed_documents.source_pdf_path IS 'Path to the original PDF file in storage';
COMMENT ON COLUMN processed_documents.content_markdown IS 'Extracted text content in markdown format';
COMMENT ON COLUMN processed_documents.image_descriptions IS 'JSON object containing descriptions of images found in the PDF';
COMMENT ON COLUMN processed_documents.processed_at IS 'Timestamp when the document was processed';