interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isBot = message.sender === 'bot';

  return (
    <div className={`flex items-start gap-3 ${isBot ? '' : 'flex-row-reverse'}`}>
      {isBot && (
        <div className="w-8 h-8 rounded-full bg-chat-primary flex items-center justify-center text-chat-primary-foreground text-sm font-semibold flex-shrink-0">
          AI
        </div>
      )}
      <div
        className={`rounded-2xl px-4 py-3 max-w-[75%] break-words ${
          isBot
            ? 'bg-chat-bot-message text-foreground rounded-tl-sm'
            : 'bg-chat-user-message text-chat-primary-foreground rounded-tr-sm'
        }`}
      >
        <p className="text-sm leading-relaxed">{message.text}</p>
      </div>
    </div>
  );
};

export default ChatMessage;
