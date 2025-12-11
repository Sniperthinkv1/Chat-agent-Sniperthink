import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Palette } from 'lucide-react';

interface ColorCustomizerProps {
  onColorChange: (primaryColor: string, secondaryColor: string) => void;
}

const ColorCustomizer = ({ onColorChange }: ColorCustomizerProps) => {
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [secondaryColor, setSecondaryColor] = useState('#EFF6FF');

  const handleApply = () => {
    onColorChange(primaryColor, secondaryColor);
    
    // Update CSS variables
    const root = document.documentElement;
    const primaryHSL = hexToHSL(primaryColor);
    const secondaryHSL = hexToHSL(secondaryColor);
    
    root.style.setProperty('--chat-primary', primaryHSL);
    root.style.setProperty('--chat-secondary', secondaryHSL);
    root.style.setProperty('--chat-user-message', primaryHSL);
  };

  const hexToHSL = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '217 91% 60%';
    
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
  };

  const presetColors = [
    { name: 'Blue', primary: '#3B82F6', secondary: '#EFF6FF' },
    { name: 'Purple', primary: '#8B5CF6', secondary: '#F5F3FF' },
    { name: 'Green', primary: '#10B981', secondary: '#ECFDF5' },
    { name: 'Orange', primary: '#F59E0B', secondary: '#FEF3C7' },
    { name: 'Red', primary: '#EF4444', secondary: '#FEE2E2' },
    { name: 'Teal', primary: '#14B8A6', secondary: '#F0FDFA' },
  ];

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Customize Chatbot Colors</h3>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="primary-color" className="text-sm font-medium mb-2 block">
            Primary Color (Buttons & User Messages)
          </Label>
          <div className="flex gap-3">
            <Input
              id="primary-color"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="flex-1 font-mono"
              placeholder="#3B82F6"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="secondary-color" className="text-sm font-medium mb-2 block">
            Secondary Color (Background Accents)
          </Label>
          <div className="flex gap-3">
            <Input
              id="secondary-color"
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="flex-1 font-mono"
              placeholder="#EFF6FF"
            />
          </div>
        </div>

        <Button onClick={handleApply} className="w-full">
          Apply Colors
        </Button>
      </div>

      <div className="pt-4 border-t">
        <Label className="text-sm font-medium mb-3 block">Color Presets</Label>
        <div className="grid grid-cols-3 gap-2">
          {presetColors.map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                setPrimaryColor(preset.primary);
                setSecondaryColor(preset.secondary);
              }}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex gap-1">
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: preset.primary }}
                />
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: preset.secondary }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default ColorCustomizer;
