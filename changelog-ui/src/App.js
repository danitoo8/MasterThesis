// src/App.js
import React, { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { CHANGELOG_ABI } from './abi';
import './App.css';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
const CHAIN_ID         = process.env.REACT_APP_CHAIN_ID;

// Traducción de mensajes de error “raw” a textos amigables
const errorTranslations = {
  'Ya voto':        'Usted ya ha votado; use otra cuenta validadora',
  'Fuera de plazo': 'La ventana de aprobación ha expirado',
};

const statusNames = ['Propuesto','Aprobado','Rechazado','Cerrado'];

function getMetaMaskProvider() {
  const { ethereum } = window;
  if (!ethereum) return null;
  if (ethereum.providers && ethereum.providers.length) {
    return ethereum.providers.find(p => p.isMetaMask) || null;
  }
  return ethereum;
}

function App() {
  const [account, setAccount]               = useState();
  const [contract, setContract]             = useState();
  const [requiredApprovals, setRequiredApprovals] = useState('0');
  const [approvalPeriod, setApprovalPeriod]       = useState('0');
  const [allIds, setAllIds]                 = useState([]);
  const [changes, setChanges]               = useState([]);
  const [counts, setCounts]                 = useState({});
  const [filterStatus, setFilterStatus]     = useState(-1);
  const [userFilter, setUserFilter]         = useState('');
  const [userIds, setUserIds]               = useState([]);
  const [newDesc, setNewDesc]               = useState('');
  const [newHash, setNewHash]               = useState('');
  const [refresh, setRefresh]               = useState(0);
  const [errorMsg, setErrorMsg]             = useState('');

  // Auto-reload on account/chain change
  useEffect(() => {
    const eth = window.ethereum;
    if (eth?.on) {
      const reload = () => window.location.reload();
      eth.on('chainChanged', reload);
      eth.on('accountsChanged', reload);
      return () => {
        eth.removeListener('chainChanged', reload);
        eth.removeListener('accountsChanged', reload);
      };
    }
  }, []);

  // Conectar MetaMask
  const connectWallet = useCallback(async () => {
    setErrorMsg('');
    const metamask = getMetaMaskProvider();
    if (!metamask) {
      setErrorMsg('Instala MetaMask para continuar');
      return;
    }
    try {
      const provider = new ethers.providers.Web3Provider(metamask);
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      const acct   = await signer.getAddress();
      const net    = await provider.getNetwork();
      if (net.chainId !== Number(CHAIN_ID)) {
        setErrorMsg(`Cambia MetaMask a Sepolia (chainId ${CHAIN_ID})`);
        return;
      }
      setAccount(acct);
      setContract(new ethers.Contract(CONTRACT_ADDRESS, CHANGELOG_ABI, signer));
    } catch (err) {
      setErrorMsg(err.message || 'Error al conectar');
    }
  }, []);

  // Leer config y counts
  useEffect(() => {
    if (!contract) return;
    (async () => {
      try {
        setErrorMsg('');
        const [req, per, ids] = await Promise.all([
          contract.requiredApprovals(),
          contract.approvalPeriod(),
          contract.getAllChangeIds()
        ]);
        setRequiredApprovals(req.toString());
        setApprovalPeriod(per.toString());
        const all = ids.map(i => i.toNumber());
        setAllIds(all);
        const cnts = await Promise.all([0,1,2,3].map(s =>
          contract.countChangesByStatus(s)
        ));
        setCounts({
          Propuesto: cnts[0].toNumber(),
          Aprobado:  cnts[1].toNumber(),
          Rechazado: cnts[2].toNumber(),
          Cerrado:   cnts[3].toNumber()
        });
      } catch (err) {
        setErrorMsg(err.reason || err.message);
      }
    })();
  }, [contract, refresh]);

  // Leer detalles + timeline de eventos
  useEffect(() => {
    if (!contract) {
      setChanges([]);
      return;
    }
    const idsToLoad = userIds.length ? userIds : allIds;
    if (!idsToLoad.length) {
      setChanges([]);
      return;
    }
    (async () => {
      try {
        setErrorMsg('');
        const provider = contract.provider;
        const detailed = await Promise.all(idsToLoad.map(async id => {
          const c = await contract.getChange(id);
          const base = {
            id:           c.id.toNumber(),
            description:  c.description,
            documentHash: c.documentHash,
            proposer:     c.proposer,
            status:       c.status,
            timestamp:    new Date(c.timestamp.toNumber()*1000)
                              .toLocaleString(),
          };

          // Recojo todos los eventos
          const [logsA, logsRj, logsCl, logsRo] = await Promise.all([
            contract.queryFilter(contract.filters.ChangeApprovalReceived(id)),
            contract.queryFilter(contract.filters.ChangeRejected(id)),
            contract.queryFilter(contract.filters.ChangeClosed(id)),
            contract.queryFilter(contract.filters.ChangeReopened(id)),
          ]);

          const evToItem = async (ev, type) => {
            const blk = await provider.getBlock(ev.blockNumber);
            const ts  = new Date(blk.timestamp * 1000);
            let actor = '';
            let comment = '';
            if (type === 'Aprobación') {
              actor = ev.args.approver;
              comment = ev.args.comment;
            }
            if (type === 'Rechazo') {
              actor = ev.args.rejector;
              comment = ev.args.comment;
            }
            if (type === 'Cierre') {
              // quien cerró: tomamos el from de la tx
              const tx = await provider.getTransaction(ev.transactionHash);
              actor = tx.from;
            }
            if (type === 'Reapertura') {
              actor = ev.args.reopener;
              comment = ev.args.reason;
            }
            return { type, actor, comment, ts };
          };

          const events = [
            ...(await Promise.all(logsA .map(ev => evToItem(ev, 'Aprobación')))),
            ...(await Promise.all(logsRj.map(ev => evToItem(ev, 'Rechazo')))),
            ...(await Promise.all(logsCl.map(ev => evToItem(ev, 'Cierre')))),
            ...(await Promise.all(logsRo.map(ev => evToItem(ev, 'Reapertura')))),
          ].sort((a,b) => b.ts - a.ts);

          return { ...base, timeline: events };
        }));

        setChanges(
          filterStatus >= 0
            ? detailed.filter(c => c.status === filterStatus)
            : detailed
        );
      } catch (err) {
        setErrorMsg(err.reason || err.message);
      }
    })();
  }, [contract, allIds, userIds, filterStatus, refresh]);

  // Filtrar por usuario
  const fetchUserChanges = useCallback(async () => {
    setErrorMsg('');
    if (!ethers.utils.isAddress(userFilter)) {
      setErrorMsg('Dirección no válida');
      return;
    }
    try {
      const ids = await contract.getUserChangeIds(userFilter);
      setUserIds(ids.map(i => i.toNumber()));
    } catch (err) {
      setErrorMsg(err.reason || err.message);
    }
  }, [contract, userFilter]);

  // Tx con traducción de error
  const doTx = useCallback(async (fn, ...args) => {
    setErrorMsg('');
    try {
      const tx = await fn(...args);
      await tx.wait();
      setRefresh(r => r + 1);
    } catch (err) {
      const raw = err.reason || err.message || '';
      const found = Object.entries(errorTranslations)
        .find(([k]) => raw.includes(k));
      setErrorMsg(found ? found[1] : raw);
    }
  }, []);

  // Si no está conectado
  if (!account) {
    return (
      <div className="container">
        {errorMsg && <div className="error">{errorMsg}</div>}
        <button onClick={connectWallet}>Conectar MetaMask</button>
      </div>
    );
  }

  // UI principal
  return (
    <div className="container">
      {errorMsg && <div className="error">{errorMsg}</div>}

      <h1>📋 Bitácora de Cambios PM²</h1>
      <p><b>Cuenta:</b> {account}</p>
      <p>
        <b>Votos requeridos:</b> {requiredApprovals} |
        <b> Plazo (seg):</b> {approvalPeriod}
      </p>
      <hr/>

      <h2>📊 Resumen</h2>
      <ul>
        <li>Propuesto: {counts.Propuesto}</li>
        <li>Aprobado:  {counts.Aprobado}</li>
        <li>Rechazado: {counts.Rechazado}</li>
        <li>Cerrado:   {counts.Cerrado}</li>
      </ul>

      <h2>🔎 Filtros</h2>
      <div className="filters">
        <label>
          Estado:
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(Number(e.target.value))}
          >
            <option value={-1}>Todos</option>
            {statusNames.map((s,i) =>
              <option key={i} value={i}>{s}</option>
            )}
          </select>
        </label>
        <label>
          Por usuario:
          <input
            type="text"
            placeholder="0x..."
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
          />
          <button onClick={fetchUserChanges}>Buscar</button>
          <button onClick={() => { setUserFilter(''); setUserIds([]); }}>
            Limpiar
          </button>
        </label>
      </div>
      <hr/>

      <h2>➕ Proponer Cambio</h2>
      <div className="card">
        <input
          type="text"
          placeholder="Descripción"
          value={newDesc}
          onChange={e => setNewDesc(e.target.value)}
        />
        <input
          type="text"
          placeholder="Hash documento"
          value={newHash}
          onChange={e => setNewHash(e.target.value)}
        />
        <button onClick={() => doTx(contract.proposeChange, newDesc, newHash)}>
          Proponer
        </button>
      </div>
      <hr/>

      <h2>📑 Cambios {userIds.length>0 ? `de ${userFilter}` : ''}</h2>
      {changes.length===0 && <p>No hay cambios para mostrar.</p>}
      {changes.map(c => (
        <div key={c.id} className="card">
          <p>
            <b>ID:</b> {c.id} | <b>Estado:</b> {statusNames[c.status]}
          </p>
          <p><b>Desc:</b> {c.description}</p>
          <p><b>Hash:</b> {c.documentHash}</p>
          <p><b>Por:</b> {c.proposer}</p>
          <p><b>Cuando:</b> {c.timestamp}</p>

          {/* Timeline sin partir líneas */}
          {c.timeline?.length > 0 && (
            <div className="subcard">
              <b>Histórico completo:</b>
              <ul>
                {c.timeline.map((ev, i) => (
                  <li key={i}>
                    [{ev.ts.toLocaleString()}] {ev.type}
                    {ev.actor && ` por ${ev.actor}`}
                    {ev.comment && ` → "${ev.comment}"`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="actions">
            {c.status === 0 && (
              <>
                <button onClick={() => doTx(contract.approveChange, c.id, '👍 OK')}>
                  👍 Aprobar
                </button>
                <button onClick={() => doTx(contract.rejectChange, c.id, '👎 No')}>
                  👎 Rechazar
                </button>
              </>
            )}
            {c.status === 1 && account === c.proposer && (
              <button onClick={() => doTx(contract.closeChange, c.id)}>
                🔒 Cerrar
              </button>
            )}
            {c.status === 3 && (
              <button onClick={() => doTx(contract.reopenChange, c.id, '🔄 Info')}>
                🔄 Reabrir
              </button>
            )}
          </div>
        </div>
      ))}

      <button className="refresh" onClick={() => setRefresh(r => r + 1)}>
        🔄 Refrescar
      </button>
    </div>
  );
}

export default App;
