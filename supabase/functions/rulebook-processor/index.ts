import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.7.1'

// '작업'의 타입을 정의
interface Job {
    id: number;
    payload: {
        file_path: string;
    };
}

serve(async (_req) => {
    try {
        // 환경 변수 확인
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!

        // Supabase 클라이언트 초기화 (서비스 키 사용)
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 1. 'pending' 상태의 작업을 하나 가져옴
        const { data: job, error: jobError } = await supabase
            .from('job_queue')
            .select('*')
            .eq('status', 'pending')
            .limit(1)
            .single()

        if (jobError) {
            if (jobError.code === 'PGRST116') {
                return new Response(JSON.stringify({ message: 'No pending jobs found.' }), { status: 200 })
            }
            throw jobError
        }

        const currentJob = job as Job
        console.log(`Processing job ID: ${currentJob.id}`)

        // 2. 작업 상태를 'processing'으로 변경
        await supabase
            .from('job_queue')
            .update({ status: 'processing' })
            .eq('id', currentJob.id)

        const filePath = currentJob.payload.file_path

        // --- 여기부터 수정된 부분 ---
        // PDF 공개 URL 생성 (SignedUrl 대신 PublicUrl 사용)
        const { data: urlData } = supabase.storage
            .from('rule-pdf')
            .getPublicUrl(filePath)

        if (!urlData?.publicUrl) {
            throw new Error('PDF 파일의 공개 URL을 생성할 수 없습니다.')
        }
        // --- 여기까지 수정된 부분 ---

        // Gemini API 초기화 및 호출
        const genAI = new GoogleGenerativeAI(geminiApiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })

        const prompt = `제공된 PDF 룰북을 분석하여 구조화된 Markdown 형식으로 변환해주십시오. 각 페이지에 대해 제목, 목록, 표 형식을 유지해야 합니다. 이미지, 차트, 다이어그램을 발견하면, 해당 내용을 묘사하는 대신 페이지 내에서 고유한 인덱스를 가진 [IMAGE: image_N.png]와 같은 플레이스홀더 태그를 삽입해주십시오. Markdown 출력 이후에는, 각 이미지에 대한 설명을 해당 플레이스홀더 태그를 키로 하는 별도의 JSON 객체로 제공해주십시오.
예시 JSON: { "image_1.png": "'미플' 이동 단계를 보여주는 다이어그램. 화살표는 유효한 이동 경로를 나타냄.", "image_2.png": "'태양석' 자원 토큰의 사진." }`

        // --- 여기도 수정된 부분 ---
        const result = await model.generateContent([{ text: prompt }, { fileData: { mimeType: 'application/pdf', fileUri: urlData.publicUrl } }])
        // --- 여기까지 수정된 부분 ---

        const response = await result.response
        const generatedText = response.text()

        // 응답 파싱
        let contentMarkdown = ''
        let imageDescriptions: Record<string, string> = {}
        const lastBraceIndex = generatedText.lastIndexOf('{')
        if (lastBraceIndex !== -1) {
            contentMarkdown = generatedText.substring(0, lastBraceIndex).trim()
            const jsonString = generatedText.substring(lastBraceIndex)
            imageDescriptions = JSON.parse(jsonString)
        } else {
            contentMarkdown = generatedText
        }

        // 3. 처리된 결과를 'processed_documents'에 저장
        await supabase
            .from('processed_documents')
            .insert({
                source_pdf_path: filePath,
                content_markdown: contentMarkdown,
                image_descriptions: imageDescriptions,
            })

        // 4. 작업 상태를 'completed'로 변경
        await supabase
            .from('job_queue')
            .update({ status: 'completed' })
            .eq('id', currentJob.id)

        console.log(`Job ID: ${currentJob.id} completed successfully.`)
        return new Response(JSON.stringify({ message: `Job ${currentJob.id} processed.` }), { status: 200 })

    } catch (error) {
        // 5. 오류 발생 시 작업 상태를 'failed'로 변경
        console.error('Error processing job:', error)
        // 'error.details'가 없을 수 있으므로 안전하게 접근
        const jobId = (error as any).details?.job_id
        if (jobId) {
            await createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
                .from('job_queue')
                .update({ status: 'failed' })
                .eq('id', jobId)
        }
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
})