import { useState } from 'react';
import ChatButton from './ChatButton';
import ChatWindow from './ChatWindow';

interface ChatWidgetProps {
  primaryColor?: string;
  secondaryColor?: string;
}

const ChatWidget = ({ primaryColor, secondaryColor }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && <ChatWindow onClose={() => setIsOpen(false)} />}
      <ChatButton 
        isOpen={isOpen} 
        onClick={() => setIsOpen(!isOpen)}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />
    </div>
  );
};

export default ChatWidget;
