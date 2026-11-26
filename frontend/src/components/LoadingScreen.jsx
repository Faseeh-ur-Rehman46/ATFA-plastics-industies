import { useState, useEffect } from 'react';
import NexaLogo from './NexaLogo';
import './LoadingScreen.css';

const DEFAULT_STAGES = [
    { threshold: 25, text: 'Initializing ATFA Plastic Core' },
    { threshold: 50, text: 'Connecting Secure Services' },
    { threshold: 75, text: 'Syncing Inventory & Ledger' },
    { threshold: 100, text: 'Workspace Ready' }
];

export default function LoadingScreen({
    onFinish,
    autoProgress = true,
    duration = 1400,
    text,
}) {
    const [progress, setProgress] = useState(autoProgress ? 0 : 75);
    const [currentStage, setCurrentStage] = useState(DEFAULT_STAGES[0]);

    useEffect(() => {
        if (!autoProgress) return;

        let startTime = null;
        let animationFrameId;

        const updateProgress = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const raw = Math.min(100, (elapsed / duration) * 100);
            const eased = Math.min(100, Math.floor(raw));
            setProgress(eased);

            const stage = DEFAULT_STAGES.find(s => eased <= s.threshold) || DEFAULT_STAGES[DEFAULT_STAGES.length - 1];
            setCurrentStage(stage);

            if (raw < 100) {
                animationFrameId = requestAnimationFrame(updateProgress);
            } else {
                setTimeout(() => {
                    if (onFinish) onFinish();
                }, 150);
            }
        };

        animationFrameId = requestAnimationFrame(updateProgress);
        return () => cancelAnimationFrame(animationFrameId);
    }, [autoProgress, duration, onFinish]);

    return (
        <div className="nexa-loading-overlay">
            <div className="nexa-loader-card">
                <div style={{ marginBottom: 20 }}>
                    <NexaLogo size={48} showText={true} />
                </div>

                <div className="nexa-progress-track">
                    <div className="nexa-progress-fill" style={{ width: `${progress}%` }} />
                </div>

                <div className="nexa-progress-meta">
                    <span className="nexa-progress-text">{text || currentStage.text}</span>
                    <span className="nexa-progress-pct">{progress}%</span>
                </div>
            </div>
        </div>
    );
}
