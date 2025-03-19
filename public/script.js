// DOM 엘리먼트
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const modelBadge = document.querySelector('.model-badge');
const modelTooltip = document.querySelector('.model-tooltip');

// 로그인 확인
function checkLogin() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    if (!userData.loggedIn) {
        window.location.href = 'login.html';
        return false;
    }
    
    return userData;
}

// GitHub Pages에서 배포된 환경과 로컬 또는 CloudType 환경을 구분
const isGitHubPages = window.location.hostname.includes('github.io');

// API 엔드포인트 설정 - GitHub Pages와 다른 환경에 맞게 조정
let API_URL = isGitHubPages 
    ? 'https://port-0-ai-chatbot-forgroup-m8bfjrmj2356a824.sel4.cloudtype.app/api/chat' 
    : '/api/chat';

// AI 모델 정보 - 서버와 일치하도록 설정
const AI_MODEL_INFO = {
    chat: 'gpt-4o-mini',
    embedding: 'text-embedding-3-small'
};

// 서비스 환경에 따른 이미지 경로 설정
function adjustImagePaths() {
    const logoImg = document.getElementById('companyLogo');
    if (!logoImg) return;
    
    // GitHub Pages 도메인인 경우 경로 조정
    if (isGitHubPages) {
        // GitHub Pages에서의 이미지 경로
        if (!logoImg.src.includes('/AI_chatbot_forGroup/')) {
            logoImg.src = '/AI_chatbot_forGroup/public/images/company-logo.png';
        }
    } else if (window.location.hostname.includes('cloudtype.app')) {
        // CloudType에서의 이미지 경로
        logoImg.src = '/public/images/company-logo.png';
    } else if (window.location.protocol === 'file:') {
        // 로컬 파일일 경우 상대 경로 사용
        logoImg.src = 'public/images/company-logo.png';
    }
}

// 설정 로드 함수 수정
async function loadConfig() {
    // 브라우저에서 직접 파일을 열었는지 확인
    const isLocalFile = window.location.protocol === 'file:';
    
    if (isLocalFile || isGitHubPages) {
        console.log('로컬 파일 또는 GitHub Pages에서 실행 중입니다. 기본 설정을 사용합니다.');
        return; // 로컬 파일이나 GitHub Pages에서 실행 중이면 fetch 요청을 건너뜀
    }
    
    try {
        // 서버에서 제공하는 설정 엔드포인트에 맞춰 경로 수정 (CloudType 환경에서만 실행)
        const response = await fetch('/config');
        if (response.ok) {
            const config = await response.json();
            console.log('서버 설정 로드됨:', config);
            if (config.apiUrl) {
                API_URL = config.apiUrl;
                console.log('API URL 업데이트됨:', API_URL);
            }
        }
    } catch (error) {
        console.error('설정을 로드하는 중 오류 발생:', error);
        // 오류가 발생해도 애플리케이션은 계속 실행 (기본 API_URL 사용)
        console.log('기본 API URL 사용:', API_URL);
    }
}

// 페이지 로드 시 설정 로드
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 로그인 확인
        const userData = checkLogin();
        if (!userData) return;
        
        await loadConfig();
        
        // AI 모델 정보 표시
        if (modelBadge) {
            modelBadge.textContent = AI_MODEL_INFO.chat;
        }
        
        // 이미지 경로 조정 함수 호출
        adjustImagePaths();
        
        // 이벤트 리스너 설정
        sendButton.addEventListener('click', handleUserMessage);
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleUserMessage();
            }
        });
        
        // 초기 메시지 시간 업데이트
        updateInitialMessageTime();
        
        // 언어 설정 적용
        applyLanguageSetting();
        
        console.log('초기화 완료, API URL:', API_URL);
    } catch (error) {
        console.error('초기화 중 오류 발생:', error);
    }
});

// 언어 설정 적용 함수
function applyLanguageSetting() {
    const currentLang = localStorage.getItem('preferredLanguage') || 'ko';
    
    // 인풋 플레이스홀더 업데이트
    const placeholder = getTranslation('enterMessage', currentLang);
    if (userInput) {
        userInput.placeholder = placeholder;
    }
    
    // 초기 메시지 업데이트
    const welcomeMsg = document.getElementById('welcomeMsg');
    if (welcomeMsg) {
        welcomeMsg.textContent = getTranslation('welcomeMessage', currentLang);
    }
    
    // 파워드 바이 메시지 업데이트
    const poweredByEl = document.querySelector('.powered-by span');
    if (poweredByEl) {
        poweredByEl.textContent = getTranslation('poweredBy', currentLang);
    }
}

// 번역 텍스트 가져오기
function getTranslation(key, lang) {
    lang = lang || localStorage.getItem('preferredLanguage') || 'ko';
    
    const translations = {
        'ko': {
            'aiHelper': 'AI HELPER',
            'logout': '로그아웃',
            'innomaxStaff': '이노맥스 직원',
            'customerStaff': '고객사 직원',
            'questionType': '질문유형',
            'selectQuestionType': '질문유형 선택',
            'problemSolving': '문제 해결',
            'dataSearch': '자료 검색',
            'equipmentType': '장비군',
            'selectEquipment': '장비군 선택',
            'customerName': '고객사',
            'selectCustomer': '고객사 선택',
            'enterMessage': '메시지를 입력하세요...',
            'welcomeMessage': '안녕하세요! 이노맥스 챗봇입니다. 무엇을 도와드릴까요? 장비군과 고객사를 선택하시면 더 정확한 답변을 드릴 수 있습니다.',
            'poweredBy': 'Vector DB: Pinecone | Embedding: text-embedding-3-small | Model: GPT-4o-mini'
        },
        'en': {
            'aiHelper': 'AI HELPER',
            'logout': 'Logout',
            'innomaxStaff': 'Innomax Staff',
            'customerStaff': 'Customer Staff',
            'questionType': 'Question Type',
            'selectQuestionType': 'Select Question Type',
            'problemSolving': 'Problem Solving',
            'dataSearch': 'Data Search',
            'equipmentType': 'Equipment Type',
            'selectEquipment': 'Select Equipment',
            'customerName': 'Customer',
            'selectCustomer': 'Select Customer',
            'enterMessage': 'Enter your message...',
            'welcomeMessage': 'Hello! I am Innomax chatbot. How can I help you? Select equipment type and customer for more accurate answers.',
            'poweredBy': 'Vector DB: Pinecone | Embedding: text-embedding-3-small | Model: GPT-4o-mini'
        },
        'ja': {
            'aiHelper': 'AI HELPER',
            'logout': 'ログアウト',
            'innomaxStaff': 'INNOMAXスタッフ',
            'customerStaff': 'お客様スタッフ',
            'questionType': '質問タイプ',
            'selectQuestionType': '質問タイプを選択',
            'problemSolving': '問題解決',
            'dataSearch': 'データ検索',
            'equipmentType': '装置タイプ',
            'selectEquipment': '装置を選択',
            'customerName': '顧客',
            'selectCustomer': '顧客を選択',
            'enterMessage': 'メッセージを入力...',
            'welcomeMessage': 'こんにちは！INNOMAXチャットボットです。どのようにお手伝いできますか？装置タイプと顧客を選択すると、より正確な回答ができます。',
            'poweredBy': 'Vector DB: Pinecone | Embedding: text-embedding-3-small | Model: GPT-4o-mini'
        },
        'zh': {
            'aiHelper': 'AI HELPER',
            'logout': '登出',
            'innomaxStaff': 'INNOMAX员工',
            'customerStaff': '客户员工',
            'questionType': '问题类型',
            'selectQuestionType': '选择问题类型',
            'problemSolving': '问题解决',
            'dataSearch': '资料搜索',
            'equipmentType': '设备类型',
            'selectEquipment': '选择设备',
            'customerName': '客户',
            'selectCustomer': '选择客户',
            'enterMessage': '输入您的消息...',
            'welcomeMessage': '您好！我是INNOMAX聊天机器人。我能为您做什么？选择设备类型和客户可以获得更准确的答案。',
            'poweredBy': 'Vector DB: Pinecone | Embedding: text-embedding-3-small | Model: GPT-4o-mini'
        }
    };
    
    return translations[lang][key] || key;
}

// 초기 메시지 시간 업데이트
function updateInitialMessageTime() {
    const initialTimeElement = document.getElementById('initialMessageTime');
    if (initialTimeElement) {
        initialTimeElement.textContent = formatTime();
    }
}

// 브라우저에서 직접 파일을 열었는지 확인
const isLocalFile = window.location.protocol === 'file:';

// 현재 시간 포맷팅 함수
function formatTime() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    
    // 현재 언어 설정 확인
    const currentLang = localStorage.getItem('preferredLanguage') || 'ko';
    
    // 언어별 시간 포맷
    if (currentLang === 'ko') {
        const ampm = hours >= 12 ? '오후' : '오전';
        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return `${ampm} ${hours}:${minutes}`;
    } else if (currentLang === 'ja') {
        const ampm = hours >= 12 ? '午後' : '午前';
        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return `${ampm} ${hours}:${minutes}`;
    } else if (currentLang === 'zh') {
        const ampm = hours >= 12 ? '下午' : '上午';
        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return `${ampm} ${hours}:${minutes}`;
    } else {
        // 영어 및 기타 언어
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutes} ${ampm}`;
    }
}

// 사용자 메시지 처리
async function handleUserMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // 로그인 확인
    const userData = checkLogin();
    if (!userData) return;

    // 사용자 메시지 UI에 추가
    addMessageToUI('user', message);
    userInput.value = '';
    
    // 전송 버튼 비활성화 및 로딩 아이콘 표시
    sendButton.disabled = true;
    sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    // 로딩 표시
    const loadingIndicator = addLoadingIndicator();

    // 현재 언어 설정 가져오기
    const currentLang = localStorage.getItem('preferredLanguage') || 'ko';

    // 로컬 파일로 실행 중인 경우 서버 요청을 보내지 않고 가상 응답을 생성
    if (isLocalFile) {
        // 잠시 딜레이를 줘서 로딩 효과를 보여줌
        setTimeout(() => {
            const responses = {
                'ko': {
                    '안녕': '안녕하세요! 이노맥스 챗봇입니다. 무엇을 도와드릴까요?',
                    '회사 소개': '이노맥스는 혁신적인 기술 솔루션을 제공하는 회사입니다. 최신 기술과 전문 지식을 바탕으로 고객에게 최상의 서비스를 제공하고 있습니다.',
                    '도움말': '저는 이노맥스 챗봇입니다. 일반 정보, 재무 정보, 장비 정보 등에 대해 답변할 수 있습니다.',
                    '모델': `현재 이 챗봇은 OpenAI의 ${AI_MODEL_INFO.chat} 모델을 사용하며, 벡터 임베딩은 ${AI_MODEL_INFO.embedding} 모델을 사용합니다. Pinecone 벡터 데이터베이스에 저장된 회사 정보를 검색하여 질문에 답변합니다.`
                },
                'en': {
                    'hello': 'Hello! I am Innomax chatbot. How can I help you?',
                    'company': 'Innomax is a company that provides innovative technology solutions. We offer the best service to our customers based on the latest technology and expertise.',
                    'help': 'I am Innomax chatbot. I can answer questions about general information, financial information, equipment information, etc.',
                    'model': `This chatbot currently uses OpenAI's ${AI_MODEL_INFO.chat} model, and the vector embedding uses the ${AI_MODEL_INFO.embedding} model. It answers questions by searching for company information stored in the Pinecone vector database.`
                },
                'ja': {
                    'こんにちは': 'こんにちは！INNOMAXチャットボットです。どのようにお手伝いできますか？',
                    '会社': 'INNOMAXは革新的な技術ソリューションを提供する会社です。最新の技術と専門知識に基づいて、お客様に最高のサービスを提供しています。',
                    'ヘルプ': '私はINNOMAXチャットボットです。一般情報、財務情報、機器情報などについて回答できます。',
                    'モデル': `現在、このチャットボットはOpenAIの${AI_MODEL_INFO.chat}モデルを使用し、ベクトル埋め込みは${AI_MODEL_INFO.embedding}モデルを使用しています。Pineconeベクトルデータベースに保存されている会社情報を検索して質問に答えます。`
                },
                'zh': {
                    '你好': '您好！我是INNOMAX聊天机器人。我能为您做什么？',
                    '公司': 'INNOMAX是提供创新技术解决方案的公司。我们基于最新技术和专业知识为客户提供最佳服务。',
                    '帮助': '我是INNOMAX聊天机器人。我可以回答有关一般信息、财务信息、设备信息等问题。',
                    '模型': `目前，此聊天机器人使用OpenAI的${AI_MODEL_INFO.chat}模型，向量嵌入使用${AI_MODEL_INFO.embedding}模型。它通过搜索存储在Pinecone向量数据库中的公司信息来回答问题。`
                }
            };

            // 현재 언어에 맞는 응답 찾기
            const langResponses = responses[currentLang] || responses['en'];
            
            // 키워드 매칭 시도
            let foundResponse = null;
            for (const [key, value] of Object.entries(langResponses)) {
                if (message.toLowerCase().includes(key.toLowerCase())) {
                    foundResponse = value;
                    break;
                }
            }

            // 매칭된 응답이 없으면 기본 응답 사용
            let botResponse = null;
            if (foundResponse) {
                botResponse = foundResponse;
            } else {
                // 다른 언어에서도 찾아보기
                for (const lang in responses) {
                    if (lang === currentLang) continue; // 이미 확인한 언어 건너뛰기
                    
                    for (const [key, value] of Object.entries(responses[lang])) {
                        if (message.toLowerCase().includes(key.toLowerCase())) {
                            // 다른 언어의 응답을 현재 언어로 변환 (간단한 매핑)
                            const keyIndex = Object.keys(responses[lang]).indexOf(key);
                            const currentLangKeys = Object.keys(langResponses);
                            if (keyIndex >= 0 && keyIndex < currentLangKeys.length) {
                                foundResponse = langResponses[currentLangKeys[keyIndex]];
                                break;
                            }
                        }
                    }
                    
                    if (foundResponse) break;
                }
                
                botResponse = foundResponse || getDefaultResponse(currentLang);
            }
            
            chatMessages.removeChild(loadingIndicator);
            addMessageToUI('bot', botResponse);
            
            // 전송 버튼 복원
            sendButton.disabled = false;
            sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }, 1500); // 1.5초 후 응답
        return;
    }

    try {
        // 백엔드 서버에 메시지 전송
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message,
                userType: userData.userType,
                language: currentLang // 언어 정보 추가
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: getServerErrorMessage(currentLang) }));
            throw new Error(errorData.error || getServerErrorMessage(currentLang));
        }

        const data = await response.json();
        
        // 로딩 표시 제거 및 답변 표시
        chatMessages.removeChild(loadingIndicator);
        addMessageToUI('bot', data.response);
    } catch (error) {
        console.error('오류 발생:', error);
        chatMessages.removeChild(loadingIndicator);
        addMessageToUI('bot', getErrorMessage(currentLang));
    } finally {
        // 전송 버튼 복원
        sendButton.disabled = false;
        sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        
        // 입력 필드에 포커스
        userInput.focus();
    }
}

// 기본 응답 메시지 가져오기
function getDefaultResponse(lang) {
    const responses = {
        'ko': '죄송합니다. 해당 질문에 대한 정보가 없습니다. 다른 질문을 해주시거나, 실제 서버 환경에서 실행해주세요.',
        'en': 'Sorry, I don\'t have information about that question. Please ask a different question or run it in a real server environment.',
        'ja': '申し訳ありませんが、その質問に関する情報はありません。別の質問をするか、実際のサーバー環境で実行してください。',
        'zh': '对不起，我没有关于该问题的信息。请提出其他问题，或在实际服务器环境中运行。'
    };
    
    return responses[lang] || responses['en'];
}

// 서버 오류 메시지 가져오기
function getServerErrorMessage(lang) {
    const messages = {
        'ko': '서버 응답 오류',
        'en': 'Server response error',
        'ja': 'サーバー応答エラー',
        'zh': '服务器响应错误'
    };
    
    return messages[lang] || messages['en'];
}

// 오류 메시지 가져오기
function getErrorMessage(lang) {
    const messages = {
        'ko': '죄송합니다. 오류가 발생했습니다. 다시 시도해 주세요.',
        'en': 'Sorry, an error occurred. Please try again.',
        'ja': '申し訳ありませんが、エラーが発生しました。もう一度お試しください。',
        'zh': '对不起，发生了错误。请再试一次。'
    };
    
    return messages[lang] || messages['en'];
}

// UI에 메시지 추가
function addMessageToUI(sender, content) {
    const time = formatTime();
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    
    // 아바타 추가
    const avatarDiv = document.createElement('div');
    avatarDiv.classList.add('avatar');
    
    const iconElement = document.createElement('i');
    if (sender === 'user') {
        iconElement.classList.add('fas', 'fa-user');
    } else {
        iconElement.classList.add('fas', 'fa-robot');
    }
    
    avatarDiv.appendChild(iconElement);
    messageDiv.appendChild(avatarDiv);
    
    // 메시지 버블 생성
    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');
    
    // 메시지 내용 추가 (코드 블록 처리 포함)
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.innerHTML = formatMessage(content);
    messageBubble.appendChild(contentDiv);
    
    // 메시지 시간 추가
    const timeDiv = document.createElement('div');
    timeDiv.classList.add('message-time');
    timeDiv.textContent = time;
    messageBubble.appendChild(timeDiv);
    
    messageDiv.appendChild(messageBubble);
    chatMessages.appendChild(messageDiv);
    
    // 스크롤을 최신 메시지 위치로
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 메시지 내용 포맷팅 (코드 블록 처리)
function formatMessage(content) {
    // 코드 블록 처리 (```로 감싸진 부분)
    let formattedContent = content.replace(/```([a-z]*)\n([\s\S]*?)```/g, (match, language, code) => {
        return `<pre><code class="language-${language}">${escapeHtml(code)}</code></pre>`;
    });
    
    // 줄바꿈 처리
    formattedContent = formattedContent.replace(/\n/g, '<br>');
    
    return formattedContent;
}

// HTML 이스케이프 함수
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 로딩 표시 추가
function addLoadingIndicator() {
    const indicator = document.createElement('div');
    indicator.classList.add('typing-indicator');
    
    // 로딩 점 추가
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        indicator.appendChild(dot);
    }
    
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return indicator;
}