export function getLoginPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mock Google Sign-In</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #f5f4ef;
      --card-bg: rgba(255, 255, 255, 0.85);
      --border: rgba(45, 43, 40, 0.12);
      --text: #2d2b28;
      --text-muted: #8a8882;
      --primary: #d96a47;
      --primary-hover: #c85835;
      --success: #16a34a;
      --success-hover: #15803d;
      --error: #cc2525;
      --input-bg: rgba(243, 241, 235, 0.8);
      --box-shadow: 0 20px 40px -15px rgba(45, 43, 40, 0.1);
      --gradient-color: rgba(217, 106, 71, 0.05);
    }
    
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #121212;
        --card-bg: rgba(30, 30, 30, 0.75);
        --border: rgba(234, 230, 223, 0.08);
        --text: #eae6df;
        --text-muted: #9b978f;
        --primary: #c95d3c;
        --primary-hover: #b35622;
        --success: #22c55e;
        --success-hover: #16a34a;
        --error: #c93336;
        --input-bg: rgba(26, 25, 22, 0.8);
        --box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        --gradient-color: rgba(201, 93, 60, 0.1);
      }
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Outfit', sans-serif;
    }
    
    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(at 0% 0%, var(--gradient-color) 0px, transparent 50%),
        radial-gradient(at 100% 100%, var(--gradient-color) 0px, transparent 50%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      transition: background-color 0.3s ease;
    }
    
    .container {
      width: 100%;
      max-width: 440px;
      animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    .card {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 1.25rem;
      padding: 2.5rem 2rem;
      box-shadow: var(--box-shadow);
      transition: all 0.3s ease;
    }

    .header {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    .logo-container {
      display: flex;
      justify-content: center;
      margin-bottom: 1rem;
    }
    
    .google-logo {
      width: 44px;
      height: 44px;
      background: #ffffff;
      padding: 9px;
      border-radius: 50%;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    h1 {
      font-size: 1.6rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      margin-bottom: 0.5rem;
      color: var(--text);
    }
    
    .subtitle {
      font-size: 0.9rem;
      color: var(--text-muted);
      line-height: 1.45;
    }

    /* Tabs styling */
    .tabs {
      display: flex;
      background: var(--input-bg);
      padding: 0.25rem;
      border-radius: 0.75rem;
      margin-bottom: 2rem;
      border: 1px solid var(--border);
    }

    .tab-btn {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 0.75rem 0.5rem;
      font-size: 0.9rem;
      font-weight: 600;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .tab-btn.active {
      background: var(--card-bg);
      color: var(--text);
      border: 1px solid var(--border);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    
    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
      animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    input {
      width: 100%;
      background: var(--input-bg);
      border: 1px solid var(--border);
      border-radius: 0.6rem;
      padding: 0.875rem 1rem;
      color: var(--text);
      font-size: 0.95rem;
      font-family: monospace;
      letter-spacing: 0.02em;
      transition: all 0.2s ease;
    }
    
    input:focus {
      outline: none;
      border-color: var(--primary);
      background: var(--card-bg);
    }
    
    .btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.65rem;
      border: none;
      border-radius: 0.85rem;
      padding: 0.9rem;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .btn-primary {
      background: var(--primary);
      color: #ffffff;
    }
    
    .btn-primary:hover {
      background: var(--primary-hover);
    }

    .btn-success {
      background: var(--primary);
      color: #ffffff;
    }

    .btn-success:hover {
      background: var(--primary-hover);
    }

    .btn-secondary {
      background: var(--input-bg);
      border: 1px solid var(--border);
      color: var(--text);
    }

    .btn-secondary:hover {
      background: var(--card-bg);
      border-color: var(--text-muted);
    }

    .generated-box {
      background: var(--input-bg);
      border: 1px dashed var(--primary);
      border-radius: 0.6rem;
      padding: 1.25rem 1rem;
      margin-bottom: 1.5rem;
      animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }

    .generated-title {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--primary);
      margin-bottom: 0.5rem;
      letter-spacing: 0.05em;
    }

    .generated-uuid-wrapper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .generated-uuid {
      font-family: monospace;
      font-size: 0.85rem;
      letter-spacing: 0.02em;
      color: var(--text);
      word-break: break-all;
      user-select: all;
    }

    .copy-btn {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--primary);
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .copy-btn:hover {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
    }

    .error-msg {
      color: var(--error);
      font-size: 0.85rem;
      margin-top: 0.5rem;
      display: none;
      font-weight: 500;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateX(8px); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 480px) {
      body {
        padding: 1rem;
      }
      .card {
        padding: 2rem 1.25rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo-container">
          <div class="google-logo">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.927h6.6c-.29 1.5-.1.14 1.14 2.1l-.01.01v2.7h4.01c2.34-2.15 3.69-5.32 3.69-8.67z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.01-2.7c-1.12.75-2.54 1.19-3.95 1.19-3.04 0-5.61-2.05-6.53-4.82H1.31v2.8C3.29 21.6 7.42 24 12 24z"/>
              <path fill="#FBBC05" d="M5.47 14.76c-.23-.69-.36-1.43-.36-2.2s.13-1.51.36-2.2V7.56H1.31C.48 9.24 0 11.08 0 13s.48 3.76 1.31 5.44l4.16-2.68z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.97 1.19 15.24 0 12 0 7.42 0 3.29 2.4 1.31 6.36l4.16 2.68c.92-2.77 3.49-4.82 6.53-4.82z"/>
            </svg>
          </div>
        </div>
        <h1>Google Account</h1>
        <p class="subtitle">Select or generate a session UUID to sign in to the isolated sandbox environment.</p>
      </div>

      <div class="tabs">
        <button type="button" class="tab-btn active" onclick="switchTab('new')">Generate Session</button>
        <button type="button" class="tab-btn" onclick="switchTab('resume')">Resume Session</button>
      </div>

      <!-- Tab: Generate New Session -->
      <div id="tab-new" class="tab-content active">
        <div id="gen-result" style="display: none;">
          <div class="generated-box">
            <div class="generated-title">Your Sandbox User ID</div>
            <div class="generated-uuid-wrapper">
              <span class="generated-uuid" id="new-uuid-text"></span>
              <button type="button" class="copy-btn" onclick="copyUuid()">Copy</button>
            </div>
          </div>
          <button type="button" class="btn btn-success" onclick="loginWithGenerated()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Start Sandbox Session
          </button>
          <button type="button" class="btn btn-secondary" style="margin-top: 0.75rem;" onclick="resetGenerator()">
            Generate Another
          </button>
        </div>

        <div id="gen-action">
          <button type="button" class="btn btn-primary" onclick="generateNewUuid()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Generate New User ID
          </button>
        </div>
      </div>

      <!-- Tab: Resume Session -->
      <div id="tab-resume" class="tab-content">
        <form onsubmit="handleResumeSubmit(event)">
          <div class="form-group">
            <label for="existing-uuid">User UUID</label>
            <input 
              type="text" 
              id="existing-uuid" 
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000" 
              required
              autocomplete="off"
              spellcheck="false"
            />
            <div id="resume-error" class="error-msg">Please enter a valid UUID format.</div>
          </div>
          <button type="submit" class="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            Resume Sandbox Session
          </button>
        </form>
      </div>
    </div>
  </div>

  <script>
    let currentUuid = '';

    function switchTab(tab) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

      if (tab === 'new') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('tab-new').classList.add('active');
      } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('tab-resume').classList.add('active');
        setTimeout(() => document.getElementById('existing-uuid').focus(), 50);
      }
    }

    function generateNewUuid() {
      // Standard UUID v4 generator in browser
      let uuid = '';
      if (typeof window.crypto !== 'undefined' && typeof window.crypto.randomUUID === 'function') {
        uuid = window.crypto.randomUUID();
      } else {
        // Fallback generator
        uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
      
      currentUuid = uuid;
      document.getElementById('new-uuid-text').textContent = uuid;
      document.getElementById('gen-action').style.display = 'none';
      document.getElementById('gen-result').style.display = 'block';
    }

    function copyUuid() {
      navigator.clipboard.writeText(currentUuid).then(() => {
        const btn = document.querySelector('.copy-btn');
        const prevText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.color = '#ffffff';
        btn.style.background = 'var(--primary)';
        setTimeout(() => {
          btn.textContent = prevText;
          btn.style.color = 'var(--primary)';
          btn.style.background = 'var(--card-bg)';
        }, 1500);
      });
    }

    function resetGenerator() {
      currentUuid = '';
      document.getElementById('gen-action').style.display = 'block';
      document.getElementById('gen-result').style.display = 'none';
    }

    function loginWithGenerated() {
      if (!currentUuid) return;
      redirectToExchange(currentUuid);
    }

    function handleResumeSubmit(e) {
      e.preventDefault();
      const input = document.getElementById('existing-uuid').value.trim();
      const errorDiv = document.getElementById('resume-error');

      // UUID v4 format regex
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (!uuidRegex.test(input)) {
        errorDiv.style.display = 'block';
        return;
      }

      errorDiv.style.display = 'none';
      redirectToExchange(input);
    }

    function redirectToExchange(uuid) {
      window.location.href = 'http://localhost:3000/auth/exchange?code=mock-google-code-' + uuid;
    }
  </script>
</body>
</html>`;
}
