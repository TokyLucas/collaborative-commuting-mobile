import DemandeService from '@/services/DemandeService';
import { router } from 'expo-router';
import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react';
import { useAuthSession } from './AuthProvider';

interface ChatBubbleContextType {
  showBubble: boolean;
  roomID: string | null;
  openChat: () => void;
}

const ChatBubbleContext = createContext<ChatBubbleContextType | undefined>(undefined);

export const ChatBubbleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [showBubble, setShowBubble] = useState(false);
  const [roomID, setRoomID] = useState<string | null>(null);

  const { token, user } = useAuthSession(); 


  useEffect(() => {
    const userId = user?.current;
    if (!userId || !token) return;

    const checkDemande = async () => {
      await checkForAcceptedDemande(userId);
    };

    checkDemande();

    const interval = setInterval(checkDemande, 30000); // toutes les 30 sec
    return () => clearInterval(interval);
  }, [user?.current, token]);

  const checkForAcceptedDemande = async (userId: string) => {
    try {
      const demande = await DemandeService.getAcceptedDemande(userId, token?.current);
      if (demande) {
        const generatedRoomID = `demande_${demande._id || demande.id}`;
        setRoomID(generatedRoomID);
        setShowBubble(true);
        console.log('[INFO] Demande acceptée trouvée, roomID:', generatedRoomID);
      } else {
        setRoomID(null);
        setShowBubble(false);
      }
    } catch (err) {
      console.error('[ERROR] checkForAcceptedDemande', err);
      setRoomID(null);
      setShowBubble(false);
    }
  };

  const openChat = () => {
    if (!roomID) return;
    router.push({
        pathname: '/(authorized)/Chat',
        params: { roomID },
      });      
  };

  return (
    <ChatBubbleContext.Provider value={{ showBubble, roomID, openChat }}>
      {children}
    </ChatBubbleContext.Provider>
  );
};

export const useChatBubble = () => {
  const context = useContext(ChatBubbleContext);
  if (!context) {
    throw new Error('useChatBubble must be used within ChatBubbleProvider');
  }
  return context;
};
