// 필요한 패키지 불러오기
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai'); // 최신 OpenAI SDK로 변경

// 환경 변수 설정
dotenv.config();

// Express 앱 초기화
const app = express();
const port = process.env.PORT || 3000;

//공통데이터
const OpenAI_API_Chat_Model = "gpt-4o-mini"; // o1-mini 모델로 변경
const OpenAI_API_Embedding_Model = "text-embedding-3-small";

// 미들웨어 설정
app.use(cors({
  origin: ['https://tgyeo.github.io', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.static('public')); // 정적 파일 제공

// 루트 경로 핸들러 추가
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI 챗봇 서버</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                line-height: 1.6;
            }
            h1 {
                color: #333;
            }
            .info {
                background-color: #f4f4f4;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
            }
        </style>
    </head>
    <body>
        <h1>AI 챗봇 서버</h1>
        <div class="info">
            <p>이 서버는 이노맥스 AI 챗봇의 백엔드 서버입니다.</p>
            <p>프론트엔드는 <a href="https://tgyeo.github.io/AI_chatbot_forGroup/" target="_blank">여기</a>에서 접근할 수 있습니다.</p>
        </div>
        <h2>API 엔드포인트</h2>
        <ul>
            <li><code>/api/chat</code> - 채팅 API (POST 요청)</li>
            <li><code>/health</code> - 서버 상태 확인 (GET 요청)</li>
            <li><code>/ping</code> - 간단한 연결 테스트 (GET 요청)</li>
        </ul>
    </body>
    </html>
  `);
});

// 건강 체크 엔드포인트 추가
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: '서버가 정상 작동 중입니다',
    openai: !!process.env.OPENAI_API_KEY,
    pinecone: !!process.env.PINECONE_API_KEY
  });
});

// 간단한 핑 테스트 엔드포인트 추가
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// 프로토타입 모드 엔드포인트 (API 장애 시 폴백 기능)
app.post('/api/chat-prototype', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: '메시지를 입력해주세요' });
    }
    
    // 간단한 키워드 기반 응답 생성
    const responses = {
      '안녕': '안녕하세요! 이노맥스 챗봇입니다. 무엇을 도와드릴까요?',
      '회사': '이노맥스는 혁신적인 기술 솔루션을 제공하는 회사입니다. 최신 기술과 전문 지식을 바탕으로 고객에게 최상의 서비스를 제공하고 있습니다.',
      '도움말': '저는 이노맥스 챗봇입니다. 일반 정보, 재무 정보, 장비 정보 등에 대해 답변할 수 있습니다.',
      '모델': `현재 이 챗봇은 OpenAI의 ${OpenAI_API_Chat_Model} 모델을 사용하며, 벡터 임베딩은 ${OpenAI_API_Embedding_Model} 모델을 사용합니다.`
    };

    // 키워드 매칭
    let response = '죄송합니다. 해당 질문에 대한 정보가 없습니다.';
    for (const [key, value] of Object.entries(responses)) {
      if (message.toLowerCase().includes(key)) {
        response = value;
        break;
      }
    }
    
    res.json({ response });
  } catch (error) {
    console.error('프로토타입 모드 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 환경 변수 설정 엔드포인트 추가 - 클라이언트에게 제공할 설정 값
app.get('/config', (req, res) => {
  // 클라이언트에 필요한 환경 변수만 노출
  res.json({
    apiUrl: process.env.API_URL
  });
});

// OpenAI 설정 (최신 방식으로 변경)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Pinecone 클라이언트 초기화
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// Pinecone 인덱스
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);

// 시스템 프롬프트 for 질문 개선
const promptEnhancerSystemPrompt = `
당신은 사용자의 질문을 Vector Database를 검색하기에 최적화된 형태로 바꾸는 AI 도우미입니다.
사용자의 원래 의도를 유지하면서, 다음과 같은 작업을 수행하세요:

1. 질문을 벡터 검색에 적합하도록 필요한 키워드를 강조하여 재구성하세요
2. 불필요한 부가 설명이나 문맥을 제거하세요
3. 이노맥스 회사 관련 정보를 더 잘 찾을 수 있도록 질문을 최적화하세요
4. 단어 선택을 개선하여 검색 결과의 관련성을 높이세요
5. 가능한 경우 질문을 더 구체적으로 만드세요

원래 질문의 의미를 변경하지 마세요. 단순히 Vector Database에서 가장 관련성 높은 결과를 얻기 위해 질문을 개선하는 것입니다.
출력은 단순히 개선된 질문 텍스트만 포함해야 합니다. 설명이나 추가 텍스트 없이 개선된 질문만 반환하세요.
`;

// 응답 생성을 위한 시스템 프롬프트
const responseGeneratorSystemPrompt = `
당신은 전문 AI 챗봇 도우미입니다. 사용자의 질문에 정확하고 도움이 되는 답변을 제공해야 합니다.

답변할 때는 다음 지침을 따르세요:
1. 컨텍스트에서 찾은 정보를 우선적으로 사용하세요
2. 간결하고 명확하게 답변하세요
3. 전문적이고 공손한 톤을 유지하세요
4. 확실하지 않은 정보에 대해서는 추측하지 마세요
5. 회사의 비밀정보가 요청되면 "해당 정보는 제공할 수 없습니다"라고 답변하세요

제공된 정보를 바탕으로 한국어로 응답하며, 사용자의 질문에 최대한 도움이 되는 정보를 제공하세요.
`;

// 채팅 API 엔드포인트
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: '메시지를 입력해주세요' });
    }

    // API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API 키가 설정되지 않았습니다' });
    }

    if (!process.env.PINECONE_API_KEY) {
      return res.status(500).json({ error: 'Pinecone API 키가 설정되지 않았습니다' });
    }

    // 1. 첫 번째 OpenAI 호출: 질문 프롬프트 개선 (최신 API 방식으로 변경)
    const promptEnhancerResponse = await openai.chat.completions.create({
      model: OpenAI_API_Chat_Model,
      messages: [
        { role: 'system', content: promptEnhancerSystemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.3,
      max_tokens: 256,
    });

    const enhancedPrompt = promptEnhancerResponse.choices[0].message.content;
    console.log('개선된 프롬프트:', enhancedPrompt);

    // 2. 임베딩 생성 (개선된 프롬프트 사용) (최신 API 방식으로 변경)
    const embeddingResponse = await openai.embeddings.create({
      model: OpenAI_API_Embedding_Model,
      input: enhancedPrompt,
    });
    
    const embedding = embeddingResponse.data[0].embedding;

    // 3. Pinecone에서 관련 컨텍스트 검색
    const queryResponse = await pineconeIndex.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
    });

    // 컨텍스트 추출
    let context = '';
    if (queryResponse.matches && queryResponse.matches.length > 0) {
      context = queryResponse.matches
        .map(match => match.metadata.text)
        .join('\n\n');
    }

    // 4. 두 번째 OpenAI 호출: 최종 응답 생성 (최신 API 방식으로 변경)
    const completion = await openai.chat.completions.create({
      model: OpenAI_API_Chat_Model,
      messages: [
        { role: 'system', content: `${responseGeneratorSystemPrompt}\n\n컨텍스트:\n${context || '관련 정보가 없습니다만, 일반적인 지식을 바탕으로 답변하겠습니다.'}` },
        { role: 'user', content: message } // 원래 사용자 질문 사용
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const botResponse = completion.choices[0].message.content;
    
    // 응답 반환
    res.json({ response: botResponse });

  } catch (error) {
    console.error('오류 발생:', error);
    
    // OpenAI API 오류 처리
    if (error.response && error.response.status) {
      console.error('OpenAI API 오류:', error.response.status, error.response.data);
      return res.status(error.response.status).json({
        error: 'OpenAI API 오류',
        details: error.response.data
      });
    }
    
    // Pinecone API 오류 처리
    if (error.name === 'PineconeError') {
      console.error('Pinecone API 오류:', error.message);
      return res.status(500).json({
        error: 'Pinecone API 오류',
        details: error.message
      });
    }
    
    res.status(500).json({ 
      error: '서버 오류가 발생했습니다', 
      details: error.message 
    });
  }
});

// 예기치 않은 오류 처리
process.on('uncaughtException', (error) => {
  console.error('예기치 않은 오류:', error);
  // 심각한 오류이지만 서버는 계속 실행
});

// 비동기 오류 처리
process.on('unhandledRejection', (reason, promise) => {
  console.error('처리되지 않은 프로미스 거부:', reason);
  // 심각한 오류이지만 서버는 계속 실행
});

// 서버 시작
const server = app.listen(port, () => {
  console.log(`서버가 포트 ${port}에서 실행 중입니다`);
});

// 우아한 종료 처리
process.on('SIGTERM', () => {
  console.log('SIGTERM 신호 받음. 서버를 종료합니다...');
  server.close(() => {
    console.log('서버가 종료되었습니다.');
    process.exit(0);
  });
});