// LunaFlow Partner Dashboard Application JavaScript

const API_BASE = '/api';

// Extract token from URL path (/partner/dashboard/{token})
const pathParts = window.location.pathname.split('/');
const token = pathParts[pathParts.length - 1];

document.addEventListener('DOMContentLoaded', () => {
    if (!token || token === 'partner-dashboard.html') {
        showError('No connection token provided.');
        return;
    }
    initDashboard();
});

async function initDashboard() {
    // Initial fetch
    await refreshDashboard();
    
    // Setup 30-second live update polling
    setInterval(refreshDashboard, 30000);
}

async function refreshDashboard() {
    try {
        const res = await fetch(`${API_BASE}/partner/public/status?token=${token}`);
        if (!res.ok) {
            if (res.status === 403) {
                showError('This secure connection link is invalid or has been disabled.');
            } else {
                showError('Error loading dashboard data.');
            }
            return;
        }

        const data = await res.json();
        updateUI(data);
    } catch (err) {
        console.error('Failed to sync partner status:', err);
    }
}

function updateUI(data) {
    // Update labels
    document.getElementById('partner-user-name').innerText = `${data.userName}'s Connection`;
    document.getElementById('partner-display-mood-emoji').innerText = data.moodEmoji;
    document.getElementById('partner-display-mood-text').innerText = data.mood;
    
    // Format Phase Label
    const phase = data.phase;
    let phaseLabel = `${phase.substring(0, 1) + phase.substring(1).toLowerCase()} Phase`;
    if (phase === 'OVULATION') phaseLabel = '🌱 Ovulation - High Energy';
    else if (phase === 'FOLLICULAR') phaseLabel = '🌱 Follicular Phase';
    else if (phase === 'MENSTRUAL') phaseLabel = '🩸 Menstrual Phase';
    else if (phase === 'LUTEAL') phaseLabel = '🌙 Luteal Phase';
    document.getElementById('partner-display-phase').innerText = phaseLabel;

    // Cycle Progress
    document.getElementById('partner-days-value').innerText = `Cycle Day ${data.currentDay}`;
    document.getElementById('partner-days-left').innerText = `${data.daysRemaining} days left`;
    
    const pct = Math.min(Math.max((data.currentDay / data.totalDays) * 100, 0), 100) || 0;
    document.getElementById('partner-progress-fill').style.width = `${pct}%`;

    // Metrics
    document.getElementById('partner-energy-val').innerText = data.energy;
    document.getElementById('partner-wellness-val').innerText = data.wellness;

    // Update Wellness Icon color
    const wIcon = document.getElementById('partner-wellness-icon');
    if (data.wellness === 'Low') {
        wIcon.className = 'cell-icon text-rose';
        wIcon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    } else if (data.wellness === 'High') {
        wIcon.className = 'cell-icon text-teal';
        wIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
    } else {
        wIcon.className = 'cell-icon text-amber';
        wIcon.innerHTML = '<i class="fa-solid fa-heart"></i>';
    }

    // Support Suggestion
    document.getElementById('partner-support-suggestion').innerText = data.suggestion;

    // Render centerpiece avatar character
    const avatarContainer = document.getElementById('partner-dashboard-avatar-container');
    if (avatarContainer) {
        avatarContainer.innerHTML = getAnimatedAvatarSVG(data.avatarState);
    }

    // Apply color theme class to the character card glow based on avatar state
    const glowCard = document.getElementById('character-card-glow');
    if (glowCard) {
        glowCard.className = `card-glow glow-${data.avatarState}`;
    }
}

function showError(msg) {
    const main = document.querySelector('.partner-dashboard-main');
    if (main) {
        main.innerHTML = `
            <div class="glass-card text-center mt-40" style="max-width: 500px; margin: 40px auto; padding: 40px;">
                <div class="text-rose" style="font-size: 48px; margin-bottom: 20px;"><i class="fa-solid fa-circle-exclamation"></i></div>
                <h3 style="color: #ffffff;">Access Denied</h3>
                <p class="mt-15" style="color: var(--text-muted); line-height: 1.6;">${msg}</p>
                <div class="mt-30">
                    <p style="font-size: 12px; color: #5c5c75;">LunaFlow Secure Gateway</p>
                </div>
            </div>
        `;
    }
}

// Reuse SVG character template inside dashboard context
function getAnimatedAvatarSVG(state) {
    let eyes = "";
    let mouth = "";
    let extra = "";
    let gradientStart = "#8B5CF6";
    let gradientEnd = "#EC4899";
    let glow = "rgba(139, 92, 246, 0.4)";
    let animationClass = "luna-calm";

    switch(state) {
        case "happy":
            gradientStart = "#10B981"; gradientEnd = "#34D399";
            glow = "rgba(16, 185, 129, 0.4)";
            animationClass = "luna-happy";
            eyes = `<path d="M30 42 Q35 34 40 42" stroke="white" stroke-width="4.5" fill="none" stroke-linecap="round"/>
                    <path d="M60 42 Q65 34 70 42" stroke="white" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
            mouth = `<path d="M40 55 Q50 68 60 55" stroke="white" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
            break;
        case "sensitive":
            gradientStart = "#FB7185"; gradientEnd = "#FDA4AF";
            glow = "rgba(251, 113, 133, 0.4)";
            animationClass = "luna-sensitive";
            eyes = `<circle cx="35" cy="42" r="7" fill="white"/>
                    <circle cx="35" cy="40" r="3" fill="#0b0b0f"/>
                    <circle cx="33" cy="44" r="2" fill="white" opacity="0.8"/>
                    <circle cx="65" cy="42" r="7" fill="white"/>
                    <circle cx="65" cy="40" r="3" fill="#0b0b0f"/>
                    <circle cx="63" cy="44" r="2" fill="white" opacity="0.8"/>`;
            mouth = `<path d="M44 60 Q50 56 56 60" stroke="white" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
            extra = `<circle cx="35" cy="48" r="2.5" fill="#67e8f9" class="tear-drop"/>`;
            break;
        case "tired":
            gradientStart = "#F59E0B"; gradientEnd = "#FBBF24";
            glow = "rgba(245, 158, 11, 0.4)";
            animationClass = "luna-tired";
            eyes = `<line x1="28" y1="42" x2="38" y2="42" stroke="white" stroke-width="4" stroke-linecap="round"/>
                    <line x1="62" y1="42" x2="72" y2="42" stroke="white" stroke-width="4" stroke-linecap="round"/>`;
            mouth = `<circle cx="50" cy="58" r="5" fill="white"/>`;
            break;
        case "irritated":
            gradientStart = "#EF4444"; gradientEnd = "#F87171";
            glow = "rgba(239, 68, 68, 0.4)";
            animationClass = "luna-irritated";
            eyes = `<path d="M26 36 L38 42" stroke="white" stroke-width="4.5" stroke-linecap="round"/>
                    <path d="M74 36 L62 42" stroke="white" stroke-width="4.5" stroke-linecap="round"/>
                    <circle cx="33" cy="47" r="3.5" fill="white"/>
                    <circle cx="67" cy="47" r="3.5" fill="white"/>`;
            mouth = `<path d="M42 62 Q50 50 58 62" stroke="white" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
            break;
        case "needs_support":
            gradientStart = "#8B5CF6"; gradientEnd = "#A78BFA";
            glow = "rgba(139, 92, 246, 0.4)";
            animationClass = "luna-support";
            eyes = `<circle cx="35" cy="42" r="6" fill="white"/>
                    <circle cx="65" cy="42" r="6" fill="white"/>`;
            mouth = `<path d="M44 58 Q50 64 56 58" stroke="white" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
            break;
        case "needs_space":
            gradientStart = "#4B5563"; gradientEnd = "#9CA3AF";
            glow = "rgba(75, 85, 99, 0.3)";
            animationClass = "luna-space";
            eyes = `<circle cx="35" cy="44" r="3" fill="white"/>
                    <circle cx="65" cy="44" r="3" fill="white"/>`;
            mouth = `<line x1="42" y1="58" x2="58" y2="58" stroke="white" stroke-width="4" stroke-linecap="round"/>`;
            break;
        case "anxious":
            gradientStart = "#14B8A6"; gradientEnd = "#2DD4BF";
            glow = "rgba(20, 184, 166, 0.4)";
            animationClass = "luna-anxious";
            eyes = `<circle cx="33" cy="42" r="6" fill="white"/>
                    <circle cx="33" cy="42" r="2" fill="#0b0b0f"/>
                    <circle cx="67" cy="42" r="6" fill="white"/>
                    <circle cx="67" cy="42" r="2" fill="#0b0b0f"/>`;
            mouth = `<path d="M40 58 Q45 54 50 58 Q55 62 60 58" stroke="white" stroke-width="4" fill="none" stroke-linecap="round"/>`;
            break;
        case "energetic":
            gradientStart = "#F59E0B"; gradientEnd = "#EF4444";
            glow = "rgba(245, 158, 11, 0.5)";
            animationClass = "luna-energetic";
            eyes = `<polygon points="35,28 37,34 43,35 38,39 39,45 35,42 31,45 32,39 27,35 33,34" fill="white"/>
                    <polygon points="65,28 67,34 73,35 68,39 69,45 65,42 61,45 62,39 57,35 63,34" fill="white"/>`;
            mouth = `<path d="M40 54 Q50 66 60 54 Z" fill="white"/>`;
            break;
        case "calm":
        default:
            gradientStart = "#8B5CF6"; gradientEnd = "#EC4899";
            glow = "rgba(139, 92, 246, 0.4)";
            animationClass = "luna-calm";
            eyes = `<path d="M28 44 Q35 48 40 44" stroke="white" stroke-width="4.5" fill="none" stroke-linecap="round"/>
                    <path d="M60 44 Q67 48 72 44" stroke="white" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
            mouth = `<path d="M44 56 Q50 60 56 56" stroke="white" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
            break;
    }

    return `
    <svg class="luna-avatar ${animationClass}" viewBox="0 0 100 100" style="width: 100%; height: 100%; filter: drop-shadow(0 0 15px ${glow});">
        <defs>
            <radialGradient id="avatarGlow-${state}" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="${gradientEnd}" />
                <stop offset="100%" stop-color="${gradientStart}" />
            </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="38" fill="url(#avatarGlow-${state})" />
        <g class="luna-face">
            ${eyes}
            ${mouth}
            ${extra}
        </g>
    </svg>
    `;
}
