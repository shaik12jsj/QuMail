# 💌 Quantum Mail (QuMail)
**Securing Tomorrow's Communication, Today**  

![QuMail Logo](qu-mail-taupe.vercel.app)

---

## 🚀 Overview
**Quantum Mail (QuMail)** is a **secure, AI-powered email platform** designed to protect digital communication against both **classical** and **quantum threats**.  
QuMail demonstrates a prototype for **quantum-resilient communication** systems essential for future national security and space missions.

---


## ✨ Features
- 🧩 **AI Security Analyzer (Gemini + Genkit)**  
  Suggests optimal encryption level based on message sensitivity in real-time.

- 🔐 **Four Layers of Security**  
  Choose from multiple encryption modes:
  | Level | Type | Description |
  |--------|------|-------------|
  | 01 | **No Quantum Security** | TLS for casual communication |
  | 02 | **PQC (Post-Quantum Cryptography)** | CRYSTALS-Dilithium for long-term protection |
  | 03 | **Quantum-Aided AES** | AES-256 with simulated Quantum Key Distribution |
  | 04 | **Quantum Secure – OTP** | One-Time Pad simulation (unbreakable encryption) |

- 🔑 **Key Management Simulation**  
  Each message generates a **unique AES-256 key**, mimicking **Quantum Key Distribution (QKD)**.

- 📧 **Secure Message Delivery (SendGrid API)**  
  Instead of sending the message directly, QuMail emails a **secure link** that decrypts the content inside the web app.

- 🧭 **Modern Web Interface**  
  Clean, responsive UI built with **Next.js**, **React**, **TailwindCSS**, and **ShadCN UI**.

---

## 🧬 Workflow

1. **Compose** – User writes an email, AI analyzes content sensitivity.
2. **Select Security Level** – User chooses one of four encryption levels.
3. **Send** – Backend encrypts message & sends a secure link using SendGrid.
4. **Receive** – Recipient opens the secure link → message decrypts in QuMail interface.

> The message body never travels through email — only the encrypted secure link does.

---

## 🧱 Tech Stack

| Layer | Tools / Technologies |
|-------|----------------------|
| **Frontend** | Next.js, React, TailwindCSS, ShadCN UI |
| **Backend** | Next.js Server Actions |
| **AI Engine** | Google Gemini Pro (via Genkit) |
| **Email Service** | SendGrid API |
| **Deployment** | Vercel (auto-deploy from GitHub) |
| **Version Control** | Git + GitHub |

---
## App Link
https://qu-mail-taupe.vercel.app/compose

## ⚙️ Setup Guide

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/shaik12jsj/QuMail.git
cd QuMail
