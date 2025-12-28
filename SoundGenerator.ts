
// SoundGenerator.ts
// Простой синтезатор звуков на Web Audio API

class SoundGenerator {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.value = 0.4; // Громкость по умолчанию
                this.masterGain.connect(this.ctx.destination);
            }
        }
    }

    private ensureContext() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Звук выстрела (Шум + Резкий спад)
    playShoot() {
        if (!this.ctx || !this.masterGain) return;
        this.ensureContext();

        const t = this.ctx.currentTime;
        
        // 1. Удар (Низкая частота)
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
        
        oscGain.gain.setValueAtTime(0.5, t);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.15);

        // 2. Взрыв (Белый шум)
        const bufferSize = this.ctx.sampleRate * 0.2; // 0.2 sec
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        // Фильтр для шума
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, t);
        filter.frequency.linearRampToValueAtTime(100, t + 0.1);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(t);
    }
}

export const soundManager = new SoundGenerator();
