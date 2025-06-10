// src/abi.js
export const CHANGELOG_ABI = [
  // Constructor
  {
    "inputs": [
      { "internalType": "address[]", "name": "initialApprovers",   "type": "address[]" },
      { "internalType": "uint256",   "name": "_requiredApprovals",  "type": "uint256"   },
      { "internalType": "uint256",   "name": "_approvalPeriodDays", "type": "uint256"   }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },

  // Eventos
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "uint256", "name": "id",       "type": "uint256" },
      { "indexed": true,  "internalType": "address", "name": "proposer", "type": "address" }
    ],
    "name": "ChangeProposed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "uint256", "name": "id",             "type": "uint256" },
      { "indexed": true,  "internalType": "address", "name": "approver",       "type": "address" },
      { "indexed": false, "internalType": "string",  "name": "comment",        "type": "string"  },
      { "indexed": false, "internalType": "uint256","name": "totalApprovals", "type": "uint256" }
    ],
    "name": "ChangeApprovalReceived",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id",       "type": "uint256" }
    ],
    "name": "ChangeApproved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "uint256", "name": "id",       "type": "uint256" },
      { "indexed": true,  "internalType": "address", "name": "rejector", "type": "address" },
      { "indexed": false, "internalType": "string",  "name": "comment",  "type": "string"  }
    ],
    "name": "ChangeRejected",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "id",       "type": "uint256" }
    ],
    "name": "ChangeClosed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "uint256", "name": "id",      "type": "uint256" },
      { "indexed": true,  "internalType": "address", "name": "reopener","type": "address" },
      { "indexed": false, "internalType": "string",  "name": "reason",  "type": "string"  }
    ],
    "name": "ChangeReopened",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType": "uint256", "name": "id",      "type": "uint256" },
      { "indexed": true,  "internalType": "address", "name": "requester","type": "address" }
    ],
    "name": "ChangeQueried",
    "type": "event"
  },

  // Funciones “write”
  {
    "inputs": [
      { "internalType": "string",  "name": "_description", "type": "string" },
      { "internalType": "string",  "name": "_documentHash","type": "string" }
    ],
    "name": "proposeChange",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_id",      "type": "uint256" },
      { "internalType": "string",  "name": "_comment", "type": "string"  }
    ],
    "name": "approveChange",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_id",      "type": "uint256" },
      { "internalType": "string",  "name": "_comment", "type": "string"  }
    ],
    "name": "rejectChange",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_id",     "type": "uint256" }
    ],
    "name": "closeChange",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_id",     "type": "uint256" },
      { "internalType": "string",  "name": "_reason", "type": "string" }
    ],
    "name": "reopenChange",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_id",     "type": "uint256" }
    ],
    "name": "queryChange",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id",               "type": "uint256"   },
          { "internalType": "string",  "name": "description",      "type": "string"    },
          { "internalType": "string",  "name": "documentHash",     "type": "string"    },
          { "internalType": "address", "name": "proposer",         "type": "address"   },
          { "internalType": "uint8",   "name": "status",           "type": "uint8"     },
          { "internalType": "uint256", "name": "timestamp",        "type": "uint256"   },
          { "internalType": "address[]","name": "approvers",       "type": "address[]" },
          { "internalType": "string[]","name": "approverComments", "type": "string[]"  },
          { "internalType": "address[]","name": "reopeners",       "type": "address[]" },
          { "internalType": "string[]","name": "reopenComments",   "type": "string[]"  },
          { "internalType": "uint256[]","name": "reopenTimestamps","type": "uint256[]" }
        ],
        "internalType": "struct ChangeLog.ChangeEntry",
        "name": "entry",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // Funciones “view” (sin gas)
  {
    "inputs": [],
    "name": "requiredApprovals",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "approvalPeriod",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllChangeIds",
    "outputs": [
      { "internalType": "uint256[]", "name": "", "type": "uint256[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_id", "type": "uint256" }
    ],
    "name": "getChange",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "id",               "type": "uint256"   },
          { "internalType": "string",  "name": "description",      "type": "string"    },
          { "internalType": "string",  "name": "documentHash",     "type": "string"    },
          { "internalType": "address", "name": "proposer",         "type": "address"   },
          { "internalType": "uint8",   "name": "status",           "type": "uint8"     },
          { "internalType": "uint256", "name": "timestamp",        "type": "uint256"   },
          { "internalType": "address[]","name": "approvers",       "type": "address[]" },
          { "internalType": "string[]","name": "approverComments", "type": "string[]"  },
          { "internalType": "address[]","name": "reopeners",       "type": "address[]" },
          { "internalType": "string[]","name": "reopenComments",   "type": "string[]"  },
          { "internalType": "uint256[]","name": "reopenTimestamps","type": "uint256[]" }
        ],
        "internalType": "struct ChangeLog.ChangeEntry",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "_user", "type": "address" }
    ], 
    "name": "getUserChangeIds",
    "outputs": [
      { "internalType": "uint256[]", "name": "", "type": "uint256[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint8", "name": "_status", "type": "uint8" }
    ],
    "name": "countChangesByStatus",
    "outputs": [
      { "internalType": "uint256", "name": "count", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint8", "name": "_status", "type": "uint8" }
    ],
    "name": "listChangesByStatus",
    "outputs": [
      { "internalType": "uint256[]", "name": "result", "type": "uint256[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];