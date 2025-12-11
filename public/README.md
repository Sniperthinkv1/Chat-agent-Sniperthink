# Webchat Widget Files

## Files in this Directory

### 1. `widget.js`
The main webchat widget script with color customization support.

**Features:**
- Custom web component (`<webchat-widget>`)
- Color attributes: `primary-color`, `secondary-color`
- Real-time messaging with SSE
- Session management
- Typing indicators

**Usage:**
```html
<webchat-widget 
  agent-id="your_id"
  primary-color="#8B5CF6"
  secondary-color="#F5F3FF">
</webchat-widget>
<script src="/widget.js" async></script>
```

### 2. `widget-config.html`
Visual configuration UI for customizing widget colors.

**Features:**
- Color picker interface
- Hex code input
- 6 preset color schemes
- Live widget preview
- Copy embed code button

**Access:**
```
http://localhost:3000/widget-config.html?agent_id=YOUR_ID
```

### 3. `test-colors.html`
Test page showing all color presets side-by-side.

**Features:**
- Visual comparison of all presets
- Interactive color switching
- Color code display
- Link to configuration tool

**Access:**
```
http://localhost:3000/test-colors.html
```

### 4. `demo.html`
Basic demo of the widget functionality.

### 5. `test-chat.html`
Testing page for widget features.

## Quick Start

1. **Create a webchat channel:**
```bash
curl -X POST http://localhost:3000/api/users/user_123/webchat/channels \
  -H "Content-Type: application/json" \
  -d '{"prompt_id": "prompt_id", "name": "My Chat"}'
```

2. **Get the config URL from response**

3. **Customize colors visually**

4. **Copy and paste embed code**

## Color Customization

### Default Colors
- Primary: `#3B82F6` (Blue)
- Secondary: `#EFF6FF` (Light Blue)

### Preset Colors
- Blue, Purple, Green, Orange, Red, Teal

### Custom Colors
Any valid hex color code (#RRGGBB format)

## Documentation

See project root for detailed documentation:
- `WEBCHAT_COLOR_CUSTOMIZATION.md` - Full documentation
- `WEBCHAT_COLOR_QUICK_START.md` - Quick start guide
- `COLOR_IMPLEMENTATION_SUMMARY.md` - Implementation summary
