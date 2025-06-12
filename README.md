# Bitácora de Cambios PM² – Proyecto TFM  
**Trabajo Fin de Máster**  
**“Blockchain y Project Management. Diseño e Implementación de Contratos Inteligentes en PM²”**  

Este proyecto implementa una Bitácora de Cambios alineada con la metodología **PM²** mediante tecnología blockchain. Utiliza **Solidity** para el contrato inteligente y **React.js + ethers.js** para el frontend.

---

## 📁 Estructura del proyecto
```text
MasterThesis/
├── ChangeLog_SmartContract.sol       # Contrato inteligente en Solidity
├── changelog-ui/                     # Lógica del frontend
│   ├── src/
│   │   ├── App.js                    # Lógica de la interfaz React
│   │   ├── abi.js                    # ABI del contrato
│   │   └── App.css                   # Estilos CSS
│   └── .env                          # Dirección del contrato y Chain ID
└── README.md                         # Este documento
```
---

## ⚙️ Requisitos previos

| Herramienta       | Versión recomendada |
|-------------------|---------------------|
| Node.js           | ≥ 18.x              |
| npm               | ≥ 9.x               |
| MetaMask          | Última              |
| Remix IDE         | Online              |

Opcional: Hardhat (CLI) si prefieres entorno local de testing.

---

## 🚀 Despliegue del contrato en Sepolia

1. Accede a [Remix](https://remix.ethereum.org)
2. Pega el contenido de `ChangeLog_SmartContract.sol`
3. Compila el contrato con la versión 0.8.x
4. Ve a **Deploy & Run Transactions**:
   - Environment: `Injected Provider (MetaMask)`
   - Asegúrate de estar en **Sepolia**
   - Constructor:
     ```solidity
     initialApprovers = ["0xAAA...", "0xBBB...", "0xCCC..."]
     _requiredApprovals = 2
     _approvalPeriodDays = 3
     ```
5. Haz clic en **Deploy** y confirma en MetaMask
6. Copia la dirección del contrato desplegado

---

## 💻 Configuración y arranque del frontend

```bash
# 1. Clonar el repositorio
git clone https://github.com/danitoo8/MasterThesis.git
cd MasterThesis/changelog-ui

# 2. Instalar dependencias
npm install

# 3. Crear archivo .env con la dirección del contrato
echo "REACT_APP_CONTRACT_ADDRESS=0xTU_CONTRATO_SEPOLIA" > .env
echo "REACT_APP_CHAIN_ID=11155111" >> .env

# 4. Lanzar la app
npm start
Visita http://localhost:3000 y conecta MetaMask (en Sepolia).
```
---

## 📄 Licencia y uso
© 2025 Daniel Fernández López

Trabajo Fin de Máster — Uso reservado para fines académicos.

---

