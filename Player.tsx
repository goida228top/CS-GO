
import React from 'react';
import { useGLTF } from '@react-three/drei';
import { PLAYER_MODEL_URL, PISTOL_URL, AK47_URL } from './constants';
import { ActivePlayer } from './ActivePlayer';

// Preload models
useGLTF.preload(PLAYER_MODEL_URL);
useGLTF.preload(PISTOL_URL);
useGLTF.preload(AK47_URL);

interface PlayerProps { 
    isLocked: boolean;
    onBuyMenuToggle: (isOpen: boolean) => void;
}

export const Player: React.FC<PlayerProps> = ({ isLocked, onBuyMenuToggle }) => {
    return (
        <ActivePlayer isLocked={isLocked} onBuyMenuToggle={onBuyMenuToggle} />
    );
};
