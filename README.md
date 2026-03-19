<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MQTT Nexus - AI-Powered MQTT Desktop Client 🚀

<div align="center">

[![Electron](https://img.shields.io/badge/Electron-Desktop-47848F?style=flat&logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![MQTT](https://img.shields.io/badge/MQTT-All_Protocols-CC0000?style=flat&logo=mqtt)](https://mqtt.org/)

**Cross-platform MQTT client with AI capabilities**

[Features](#features) • [Quick Start](#quick-start) • [Protocols](#protocol-support) • [Documentation](#documentation)

</div>

---

## ✨ Features

### 🔌 Complete MQTT Protocol Support

- ✅ **mqtt://** - TCP protocol for native connections (Electron only)
- ✅ **mqtts://** - TLS/SSL encrypted TCP (Electron only)
- ✅ **ws://** - WebSocket protocol for browser compatibility
- ✅ **wss://** - Secure WebSocket for encrypted web connections

> **Note**: Browser environment only supports `ws://` and `wss://`. For full MQTT protocol support, use the Electron desktop app.

### 🎯 Core Features

- 📊 **Real-time Message Monitoring** - Subscribe and publish to topics with live updates
- 🔍 **Message Diff Viewer** - Compare message payloads side-by-side
- 🤖 **AI Integration** - Gemini API for intelligent message analysis
- 💾 **Connection Management** - Save and manage multiple broker configurations
- 🎨 **Modern UI** - Beautiful dark theme with Tailwind CSS
- 📱 **Responsive Design** - Works on all screen sizes

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x

### Installation

```bash
npm install
```

### Development

#### Option 1: Electron Desktop App (Recommended)

Run in Electron desktop mode with full MQTT protocol support:

```bash
npm run electron:dev
```

This launches both the Vite dev server and Electron window.

#### Option 2: Web Browser Mode

Run in browser mode (WebSocket protocols only):

```bash
npm run dev
```

Then visit http://localhost:3000

### Environment Setup

Create a `.env.local` file with your Gemini API key:

```
GEMINI_API_KEY=your_api_key_here
```

---

## 📦 Build & Distribution

### Build for Current Platform

```bash
npm run electron:build
```

### Build for Specific Platforms

```bash
# Windows
npm run electron:build:win

# macOS
npm run electron:build:mac

# Linux
npm run electron:build:linux
```

Build artifacts will be in the `release/` directory.

---

## 🔌 Protocol Support

| Protocol | Port | Security | Environment | Use Case |
|----------|------|----------|-------------|----------|
| `mqtt://` | 1883 | ❌ None | Electron Only | LAN development |
| `mqtts://` | 8883 | ✅ TLS/SSL | Electron Only | Production secure |
| `ws://` | 8083 | ❌ None | All | Web development |
| `wss://` | 8084 | ✅ TLS/SSL | All | Production web |

### Public Broker Examples

**EMQX Public Broker:**
- mqtt://broker.emqx.io:1883
- mqtts://broker.emqx.io:8883
- ws://broker.emqx.io:8083/mqtt
- wss://broker.emqx.io:8084/mqtt

**HiveMQ Public Broker:**
- mqtt://broker.hivemq.com:1883
- ws://broker.hivemq.com:8000/mqtt

---

## 📚 Documentation

- **[Electron Guide](ELECTRON.md)** - Electron setup and build instructions
- **[Protocol Guide](MQTT_PROTOCOL_GUIDE.md)** - Complete MQTT protocol usage guide
- **[AI Studio App](https://ai.studio/apps/9135169b-d016-48af-b698-76e4e67fece04)** - View in AI Studio

---

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4
- **MQTT Client**: MQTT.js 5
- **Desktop**: Electron 35
- **Icons**: Lucide React
- **AI**: Google Gemini API

---

## 📁 Project Structure

```
MQTT-Nexus/
├── electron/              # Electron main process
│   ├── main.ts           # Main entry point
│   └── preload.ts        # Preload script
├── src/                  # React frontend
│   ├── components/       # UI components
│   ├── hooks/            # Custom hooks (useMqtt)
│   ├── lib/              # Utilities
│   └── types.ts          # Type definitions
├── dist/                 # Vite build output
├── dist-electron/        # Electron build output
├── release/              # Packaged applications
└── package.json          # Project configuration
```

---

## 🔐 Security Best Practices

1. **Use Encrypted Protocols**: Always prefer `mqtts://` or `wss://` in production
2. **Enable Authentication**: Configure username/password for brokers
3. **Verify Certificates**: Validate TLS certificates for secure connections
4. **Protect API Keys**: Never commit `.env.local` to version control

---

## 🤝 Contributing

Issues and Pull Requests are welcome!

## 📄 License

MIT License

---

<div align="center">

**Built with ❤️ using React, Electron, and MQTT**

</div>
