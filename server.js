// 필요한 패키지 불러오기
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai'); // 최신 OpenAI SDK로 변경
const path = require('path');

// 환경 변수 설정
dotenv.config();

// Express 앱 초기화
const app = express();
const port = process.env.PORT || 3000;

//공통데이터
const OpenAI_API_Chat_Model = "gpt-4o-mini"; // o1-mini 모델로 변경
const OpenAI_API_Embedding_Model = "text-embedding-3-small";

// 미들웨어 설정
//app.use(cors({
//  origin: ['https://tgyeo.github.io', 'http://localhost:3000', 'http://127.0.0.1:5500'],
//  credentials: true
//}));

// 단순화된 CORS 설정
app.use(cors({
  origin: '*',  // 개발 환경에서는 모든 도메인 허용
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());
app.use(express.static('public')); // 정적 파일 제공

// 사용자 인증 검증 미들웨어
function validateUser(req, res, next) {
  const { userType } = req.body;
  
  // 간단한 인증 체크
  if (!userType) {
    return res.status(401).json({ error: '인증 오류', message: '사용자 유형이 제공되지 않았습니다.' });
  }
  
  // 승인된 사용자 유형 검증
  if (userType !== 'innomax' && userType !== 'customer') {
    return res.status(403).json({ error: '권한 오류', message: '유효하지 않은 사용자 유형입니다.' });
  }
  
  next();
}

// 루트 경로 핸들러 추가
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 로그인 페이지 라우트
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
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

// 환경 변수 설정 엔드포인트 추가 - 클라이언트에게 제공할 설정 값
app.get('/config', (req, res) => {
  // 클라이언트에 필요한 환경 변수만 노출
  res.json({
    apiUrl: process.env.API_URL
  });
});

// 다국어 시스템 프롬프트 설정
const systemPrompts = {
  'ko': {
    promptEnhancer: `
      당신은 사용자의 질문을 Vector Database를 검색하기에 최적화된 형태로 바꾸는 AI 도우미입니다.
      사용자의 원래 의도를 유지하면서, 다음과 같은 작업을 수행하세요:

      1. 질문을 벡터 검색에 적합하도록 필요한 키워드를 강조하여 재구성하세요
      2. 불필요한 부가 설명이나 문맥을 제거하세요
      3. 이노맥스 회사 관련 정보를 더 잘 찾을 수 있도록 질문을 최적화하세요
      4. 단어 선택을 개선하여 검색 결과의 관련성을 높이세요
      5. 가능한 경우 질문을 더 구체적으로 만드세요

      원래 질문의 의미를 변경하지 마세요. 단순히 Vector Database에서 가장 관련성 높은 결과를 얻기 위해 질문을 개선하는 것입니다.
      출력은 단순히 개선된 질문 텍스트만 포함해야 합니다. 설명이나 추가 텍스트 없이 개선된 질문만 반환하세요.
      `,
          responseGenerator: `
      당신은 전문 AI 챗봇 도우미입니다. 사용자의 질문에 정확하고 도움이 되는 답변을 제공해야 합니다.

      답변할 때는 다음 지침을 따르세요:
      1. 컨텍스트에서 찾은 정보를 우선적으로 사용하세요
      2. 간결하고 명확하게 답변하세요
      3. 전문적이고 공손한 톤을 유지하세요
      4. 확실하지 않은 정보에 대해서는 추측하지 마세요
      5. 회사의 비밀정보가 요청되면 "해당 정보는 제공할 수 없습니다"라고 답변하세요

      제공된 정보를 바탕으로 한국어로 응답하며, 사용자의 질문에 최대한 도움이 되는 정보를 제공하세요.
      `
        },
        'en': {
          promptEnhancer: `
      You are an AI assistant that optimizes user questions for Vector Database search.
      While maintaining the original intention of the user, perform the following tasks:

      1. Restructure the question to emphasize necessary keywords for vector search
      2. Remove unnecessary additional explanations or context
      3. Optimize the question to better find information related to Innomax company
      4. Improve word choice to increase the relevance of search results
      5. Make the question more specific where possible

      Do not change the meaning of the original question. Simply improve the question to get the most relevant results from the Vector Database.
      The output should only include the improved question text. Return only the improved question without explanations or additional text.
      `,
          responseGenerator: `
      You are a professional AI chatbot assistant. You should provide accurate and helpful answers to user questions.

      Follow these guidelines when answering:
      1. Prioritize information found in the context
      2. Answer concisely and clearly
      3. Maintain a professional and polite tone
      4. Do not guess about information you are not sure about
      5. If company confidential information is requested, answer "I cannot provide that information"

      Respond in English based on the provided information, and provide information that is most helpful to the user's question.
      `
        },
        'ja': {
          promptEnhancer: `
      あなたはユーザーの質問をベクトルデータベース検索に最適化するAIアシスタントです。
      ユーザーの元の意図を維持しながら、次のタスクを実行してください：

      1. ベクトル検索に必要なキーワードを強調するように質問を再構成する
      2. 不要な追加説明や文脈を削除する
      3. INNOMAX会社に関連する情報をよりよく見つけるために質問を最適化する
      4. 検索結果の関連性を高めるために単語の選択を改善する
      5. 可能であれば質問をより具体的にする

      元の質問の意味を変更しないでください。単にベクトルデータベースから最も関連性の高い結果を得るために質問を改善するだけです。
      出力は改善された質問テキストのみを含める必要があります。説明や追加テキストなしで、改善された質問のみを返してください。
      `,
          responseGenerator: `
      あなたはプロフェッショナルなAIチャットボットアシスタントです。ユーザーの質問に正確で役立つ回答を提供する必要があります。

      回答する際は、次のガイドラインに従ってください：
      1. コンテキストで見つかった情報を優先する
      2. 簡潔かつ明確に回答する
      3. プロフェッショナルで丁寧な口調を維持する
      4. 確信が持てない情報については推測しない
      5. 会社の機密情報が要求された場合は、「その情報は提供できません」と回答する

      提供された情報に基づいて日本語で応答し、ユーザーの質問に最も役立つ情報を提供してください。
      `
        },
        'zh': {
          promptEnhancer: `
      您是一位优化用户问题以进行向量数据库搜索的AI助手。
      在保持用户原意的同时，执行以下任务：

      1. 重构问题，强调向量搜索所需的关键词
      2. 删除不必要的附加解释或上下文
      3. 优化问题，以更好地查找与INNOMAX公司相关的信息
      4. 改进词语选择，以提高搜索结果的相关性
      5. 尽可能使问题更具体

      请勿更改原始问题的含义。只需改进问题，以从向量数据库获取最相关的结果。
      输出应仅包含改进后的问题文本。仅返回改进后的问题，不包含解释或其他文本。
      `,
          responseGenerator: `
      您是一位专业的AI聊天机器人助手。您应该为用户问题提供准确且有帮助的答案。

      回答时请遵循以下准则：
      1. 优先使用上下文中找到的信息
      2. 简明扼要地回答
      3. 保持专业和礼貌的语气
      4. 对不确定的信息不要猜测
      5. 如果要求提供公司机密信息，请回答"我无法提供该信息"

      根据提供的信息用中文回应，并提供对用户问题最有帮助的信息。
      `
  }
};

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

// 프로토타입 모드 엔드포인트 (API 장애 시 폴백 기능)
app.post('/api/chat-prototype', (req, res) => {
  try {
    const { message, language = 'ko' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: '메시지를 입력해주세요' });
    }
    
    // 언어별 응답 준비
    const responses = {
      'ko': {
        '안녕': '안녕하세요! 이노맥스 챗봇입니다. 무엇을 도와드릴까요?',
        '회사': '이노맥스는 혁신적인 기술 솔루션을 제공하는 회사입니다. 최신 기술과 전문 지식을 바탕으로 고객에게 최상의 서비스를 제공하고 있습니다.',
        '도움말': '저는 이노맥스 챗봇입니다. 일반 정보, 재무 정보, 장비 정보 등에 대해 답변할 수 있습니다.',
        '모델': `현재 이 챗봇은 OpenAI의 ${OpenAI_API_Chat_Model} 모델을 사용하며, 벡터 임베딩은 ${OpenAI_API_Embedding_Model} 모델을 사용합니다.`
      },
      'en': {
        'hello': 'Hello! I am Innomax chatbot. How can I help you?',
        'company': 'Innomax is a company that provides innovative technology solutions. We offer the best service to our customers based on the latest technology and expertise.',
        'help': 'I am Innomax chatbot. I can answer questions about general information, financial information, equipment information, etc.',
        'model': `This chatbot currently uses OpenAI's ${OpenAI_API_Chat_Model} model, and the vector embedding uses the ${OpenAI_API_Embedding_Model} model.`
      },
      'ja': {
        'こんにちは': 'こんにちは！INNOMAXチャットボットです。どのようにお手伝いできますか？',
        '会社': 'INNOMAXは革新的な技術ソリューションを提供する会社です。最新の技術と専門知識に基づいて、お客様に最高のサービスを提供しています。',
        'ヘルプ': '私はINNOMAXチャットボットです。一般情報、財務情報、機器情報などについて回答できます。',
        'モデル': `現在、このチャットボットはOpenAIの${OpenAI_API_Chat_Model}モデルを使用し、ベクトル埋め込みは${OpenAI_API_Embedding_Model}モデルを使用しています。`
      },
      'zh': {
        '你好': '您好！我是INNOMAX聊天机器人。我能为您做什么？',
        '公司': 'INNOMAX是提供创新技术解决方案的公司。我们基于最新技术和专业知识为客户提供最佳服务。',
        '帮助': '我是INNOMAX聊天机器人。我可以回答有关一般信息、财务信息、设备信息等问题。',
        '模型': `目前，此聊天机器人使用OpenAI的${OpenAI_API_Chat_Model}模型，向量嵌入使用${OpenAI_API_Embedding_Model}模型。`
      }
    };

    // 선택된 언어에 맞는 응답 선택
    const langResponses = responses[language] || responses['en'];
    
    // 키워드 매칭
    let response = '';
    for (const [key, value] of Object.entries(langResponses)) {
      if (message.toLowerCase().includes(key.toLowerCase())) {
        response = value;
        break;
      }
    }
    
    // 매칭되는 응답이 없을 경우 기본 응답
    if (!response) {
      const defaultResponses = {
        'ko': '죄송합니다. 해당 질문에 대한 정보가 없습니다.',
        'en': 'Sorry, I don\'t have information about that question.',
        'ja': '申し訳ありませんが、その質問に関する情報はありません。',
        'zh': '对不起，我没有关于该问题的信息。'
      };
      
      response = defaultResponses[language] || defaultResponses['en'];
    }
    
    res.json({ response });
  } catch (error) {
    console.error('프로토타입 모드 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

// 1. 프롬프트 개선 API
app.post('/api/enhance-prompt', validateUser, async (req, res) => {
  try {
    const { message, language = 'ko' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: '메시지를 입력해주세요' });
    }

    // API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API 키가 설정되지 않았습니다' });
    }

    // 언어 설정 가져오기
    const prompts = systemPrompts[language] || systemPrompts['en'];

    // OpenAI 호출: 질문 프롬프트 개선
    const promptEnhancerResponse = await openai.chat.completions.create({
      model: OpenAI_API_Chat_Model,
      messages: [
        { role: 'system', content: prompts.promptEnhancer },
        { role: 'user', content: message }
      ],
      temperature: 0.3,
      max_tokens: 256,
    });

    const enhancedPrompt = promptEnhancerResponse.choices[0].message.content;
    
    // 개선된 프롬프트 반환
    res.json({
      enhancedPrompt: enhancedPrompt,
      originalMessage: message
    });
    
  } catch (error) {
    console.error('프롬프트 개선 오류:', error);
    
    const language = req.body.language || 'ko';
    const errorMessage = getErrorMessageByLanguage(language);
    
    res.status(500).json({ 
      error: errorMessage, 
      details: error.message 
    });
  }
});

// 2. 응답 생성 API
app.post('/api/chat', validateUser, async (req, res) => {
  try {
    const { message, originalMessage, userType, language = 'ko', questionType = '', equipmentType = '', customerName = '' } = req.body;
    
    if (!message || !originalMessage) {
      return res.status(400).json({ error: '메시지 정보가 누락되었습니다' });
    }

    // API 키 확인
    if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY) {
      return res.status(500).json({ error: 'API 키가 설정되지 않았습니다' });
    }

    // 언어 설정 가져오기
    const prompts = systemPrompts[language] || systemPrompts['en'];

    // 임베딩 생성
    const embeddingResponse = await openai.embeddings.create({
      model: OpenAI_API_Embedding_Model,
      input: message,
    });
    
    const embedding = embeddingResponse.data[0].embedding;

    // Pinecone에서 관련 컨텍스트 검색
    const queryResponse = await pineconeIndex.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
      filter: userType === 'customer' ? { access: 'public' } : {}
    });

    // 컨텍스트 추출
    let context = '';
    if (queryResponse.matches && queryResponse.matches.length > 0) {
      context = queryResponse.matches
        .map(match => match.metadata.text)
        .join('\n\n');
    }

    // 최종 응답 생성
    const completion = await openai.chat.completions.create({
      model: OpenAI_API_Chat_Model,
      messages: [
        { role: 'system', content: `${prompts.responseGenerator}\n\n컨텍스트:\n${context || '관련 정보가 없습니다만, 일반적인 지식을 바탕으로 답변하겠습니다.'}` },
        { role: 'user', content: originalMessage }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const botResponse = completion.choices[0].message.content;
    
    // 응답 반환
    res.json({ response: botResponse });
    
  } catch (error) {
    console.error('응답 생성 오류:', error);
    
    const language = req.body.language || 'ko';
    const errorMessage = getErrorMessageByLanguage(language);
    
    res.status(500).json({ 
      error: errorMessage, 
      details: error.message 
    });
  }
});

// 오류 메시지 반환 함수
function getErrorMessageByLanguage(language) {
  const errorMessages = {
    'ko': '서버 오류가 발생했습니다',
    'en': 'A server error occurred',
    'ja': 'サーバーエラーが発生しました',
    'zh': '发生服务器错误'
  };
  
  return errorMessages[language] || errorMessages['en'];
}

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