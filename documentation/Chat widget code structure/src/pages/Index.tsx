import { useState } from 'react';
import ChatWidget from '@/components/ChatWidget';
import ColorCustomizer from '@/components/ColorCustomizer';
import { Code2, MessageSquare, Palette, Zap } from 'lucide-react';

const Index = () => {
  const [primaryColor, setPrimaryColor] = useState<string>();
  const [secondaryColor, setSecondaryColor] = useState<string>();

  const handleColorChange = (primary: string, secondary: string) => {
    setPrimaryColor(primary);
    setSecondaryColor(secondary);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Universal Chatbot Widget
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional, customizable chatbot for any website. Change colors instantly with hex codes.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
              <MessageSquare className="w-10 h-10 mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Real-time Chat</h3>
              <p className="text-sm text-muted-foreground">
                Instant messaging with smooth animations
              </p>
            </div>
            <div className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
              <Palette className="w-10 h-10 mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Full Customization</h3>
              <p className="text-sm text-muted-foreground">
                Change colors with hex codes instantly
              </p>
            </div>
            <div className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
              <Zap className="w-10 h-10 mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Easy Integration</h3>
              <p className="text-sm text-muted-foreground">
                Simple to embed on any website
              </p>
            </div>
            <div className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
              <Code2 className="w-10 h-10 mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Developer Friendly</h3>
              <p className="text-sm text-muted-foreground">
                Clean API and documentation
              </p>
            </div>
          </div>

          {/* Customizer Section */}
          <div className="max-w-2xl mx-auto">
            <ColorCustomizer onColorChange={handleColorChange} />
          </div>

          {/* Demo Instructions */}
          <div className="max-w-2xl mx-auto bg-card p-6 rounded-xl border">
            <h3 className="font-semibold text-lg mb-3">Try it out!</h3>
            <ol className="space-y-2 text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">1.</span>
                Click the chat button in the bottom-right corner
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">2.</span>
                Customize colors using hex codes above
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">3.</span>
                See changes applied instantly to the chatbot
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">4.</span>
                Try the preset colors for quick customization
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Chat Widget */}
      <ChatWidget primaryColor={primaryColor} secondaryColor={secondaryColor} />
    </div>
  );
};

export default Index;
