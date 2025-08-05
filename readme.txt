# 🚀 HYPERMarketNFT P2P

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

**A decentralized peer-to-peer marketplace for NFT artists and collectors**  
*Runs completely on your local machine — no servers, no middlemen*

[🎨 Features](#-features) • [🛠️ Installation](#️-installation) • [💡 Usage](#-usage) • [🔐 Security](#-security) • [🤝 Contributing](#-contributing)

---

</div>

## 🎯 Vision

Born from the passion of an NFT artist, HYPERMarketNFT P2P reimagines digital art trading through true decentralization. This isn't just another marketplace — it's a peer-to-peer revolution that puts control back in the hands of creators and collectors.

## ✨ Features

- **🔒 Fully Decentralized** — No centralized servers or backends
- **🏠 Local-First** — Runs entirely on your machine at `http://127.0.0.1:PORT`
- **👥 Peer-to-Peer** — Direct artist-to-collector connections
- **🎨 Artist-Friendly** — Built by an artist, for artists
- **💎 TAP Token Integration** — Seamless HYPERTOKENS wallet support
- **🛡️ Privacy-Focused** — You control your own environment

## 🛠️ Installation

### Prerequisites

Ensure you have Node.js (≥16.0.0) installed, then install Pear globally:

```bash
npm install -g pear
```

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/dustinAI/hnftmarket
   cd HYPERMarketNFT-P2P
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start your local marketplace**
   ```bash
   node server.js store1
   ```

4. **Access your marketplace**  
   Open your browser and navigate to `http://127.0.0.1:PORT`

## 💡 Usage

### Initial Setup

The initial peer node (`store1`) acts as an operator and can use a fresh wallet. For trading, ensure you're using the correct seed phrase linked to your HYPERTOKENS wallet.

### Trading Process

1. Connect your HYPERTOKENS wallet using your seed phrase
2. Browse available NFTs from connected peers
3. Execute trades directly peer-to-peer
4. TAP tokens are sent from your linked wallet address

## 🔐 Security & Wallet Information

> **⚠️ CRITICAL: Wallet Verification Required**

### Seed Phrase Requirements
- Use the **exact** seed phrase linked to your HYPERTOKENS wallet
- TAP tokens will be sent from this wallet address
- The sender address must match the system's expected address

### Official HYPERMARKET Wallet
Send TAP tokens **only** to this official address:
```
6346465811d55a117042949cf0ccb42a2c2d2d527fcd3f0914b5983fe79e146f
```

### ✅ Pre-Transaction Checklist
- [ ] Verify your seed phrase is correct
- [ ] Double-check the official HYPERMARKET wallet address
- [ ] Ensure sufficient TAP token balance

## 🎨 About the Project

This marketplace was born from an artist's vision to create a truly decentralized trading platform. While originally conceived as a web application, the realization that centralization wouldn't serve the community led to this innovative peer-to-peer approach.

**Note:** This project runs locally and privately — not built on Pear natively, but designed with the same decentralized principles in mind.

## 🚀 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Artist Node   │◄──►│  Collector Node │◄──►│  Operator Node  │
│   (Local P2P)   │    │   (Local P2P)   │    │   (store1)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  HYPERTOKENS   │
                    │     Wallet      │
                    └─────────────────┘
```

## 🤝 Contributing

Your contributions make this marketplace stronger! Whether you're fixing bugs, adding features, or improving documentation, every contribution matters.

### How to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Issues & Questions
Feel free to open an issue for:
- Bug reports
- Feature requests
- Questions about implementation
- General feedback

## 📞 Support

Need help? Have questions? 

- 📧 Open an issue on GitHub
- 💬 Join our community discussions
- 🐛 Report bugs through the issue tracker

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with passion by an NFT artist who believes in the power of decentralized creativity. Special thanks to the community of artists and collectors who inspire this work.

---

<div align="center">

**Made with ❤️ for the NFT community**

[⭐ Star this project](https://github.com/dustinAI/hnftmarket) if you find it useful!

</div>
