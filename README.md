# 🌈 Queer Journal

En privat, lättviktigt **dagbok/antecknings-app** byggd med **HTML, CSS & JavaScript + Firebase**.  
Appen fungerar som **PWA (Progressive Web App)** – du kan installera den på mobilen eller datorn och den fungerar även offline tack vare Firestore-cache.

👉 **Live demo:** [Queer Journal](https://robynt98.github.io/queerjournal/)

---

## ✨ Funktioner
- 🔐 Inloggning med **E-post/Lösenord** eller **Google**
- 📧 Glömt lösenord (skickar återställningslänk via Firebase)
- 👤 Profilchip i header + logga ut-knapp
- 📅 Skapa anteckningar med datum & tid  
- ⏰ Ställ in alarm för viktiga händelser (lokal notis + ljud)  
- 😍 Välj känsla/emojis som passar  
- 🏷️ Lägg till taggar för att sortera  
- 🖼️ Ladda upp bilder till anteckningar (sparas lokalt som data-URL)  
- ⚡ Realtidssynk via Firestore  
- 📦 Offline-cache (IndexedDB + localStorage fallback)  
- 🛡️ Säkerhet: varje användare ser **endast sina egna anteckningar**  
- 🛠️ Adminpanel för `superadmin`:  
  - ⚠️ Skicka varningar  
  - 🚫 Blockera användare (blockade konton spärras direkt vid inlogg)  
- 🌈 HBTQ-vänlig design med fokus på inkludering  
- 📱 Installera som app via PWA

---

## 🚀 Installation

Du kan använda appen direkt via GitHub Pages:  
[https://robynt98.github.io/queerjournal/](https://robynt98.github.io/queerjournal/)
---
Vill du köra lokalt?  

```bash
git clone https://github.com/RobynT98/queerjournal.git
cd queerjournal
---
## 📜 Licens & bidrag

Detta projekt är släppt under [MIT License](LICENSE) för den öppna versionen.  
Det betyder att du fritt kan använda, ändra och sprida appen så länge du anger originalet.

⚠️ **Viktigt för bidragsgivare:**  
Genom att bidra till projektet accepterar du vår [Contributor License Agreement (CLA)](CONTRIBUTOR_LICENSE_AGREEMENT.md).  
Det innebär att projektägaren **Conri Turesson** har rätt att i framtiden:
- ändra licens för nya versioner,
- skapa premium- eller kommersiella varianter av appen.

Ditt bidrag till den öppna versionen kommer alltid att förbli MIT-licensierat.

