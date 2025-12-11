import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatButtonProps {
  isOpen: boolean;
  onClick: () => void;
  primaryColor?: string;
  secondaryColor?: string;
}

const ChatButton = ({ isOpen, onClick, primaryColor }: ChatButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-14 h-14 rounded-full shadow-chat-lg transition-all duration-300 flex items-center justify-center",
        "hover:scale-110 active:scale-95",
        "focus:outline-none focus:ring-4 focus:ring-chat-primary/30"
      )}
      style={{
        backgroundColor: primaryColor || 'hsl(var(--chat-primary))',
        color: 'hsl(var(--chat-primary-foreground))'
      }}
      aria-label={isOpen ? "Close chat" : "Open chat"}
    >
      {isOpen ? (
        <X className="w-6 h-6 transition-transform duration-300" />
      ) : (
        <MessageCircle className="w-6 h-6 transition-transform duration-300" />
      )}
    </button>
  );
};

export default ChatButton;
