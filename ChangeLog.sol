// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ChangeLog {

    // Estado de cada cambio
    enum Status { Proposed, Approved, Rejected, Closed }

    // Estructura para almacenar los datos del cambio
    struct ChangeEntry {
        uint id;                   // Identificador del cambio
        string description;        // Descripción del cambio
        string documentHash;       // Hash del documento asociado (PDF, acta, etc.)
        address proposer;          // Quien propone el cambio
        address approver;          // Quien aprueba o rechaza
        Status status;             // Estado actual del cambio
        uint timestamp;            // Fecha de creación (Unix timestamp)
        string comment;            // Comentario del aprobador
    }

    address public projectManager;         // Dirección del gestor del proyecto
    address public changeApprover;         // Dirección del aprobador designado

    uint public nextChangeId = 0;          // Contador incremental de cambios
    mapping(uint => ChangeEntry) public changes;  // Mapeo ID => Cambio
    mapping(address => uint[]) public userChanges; // Historial por usuario
    ChangeEntry[] private changeList;             // Lista completa de cambios

    // Eventos
    event ChangeProposed(uint id, address proposer);
    event ChangeApproved(uint id, address approver, string comment);
    event ChangeRejected(uint id, address approver, string comment);
    event ChangeClosed(uint id);

    // Modificadores de acceso
    modifier onlyProjectManager() {
        require(msg.sender == projectManager, "Solo el Project Manager puede ejecutar esta funcion.");
        _;
    }

    modifier onlyChangeApprover() {
        require(msg.sender == changeApprover, "Solo el Change Approver puede aprobar o rechazar.");
        _;
    }

    // Constructor del contrato
    constructor(address _changeApprover) {
        projectManager = msg.sender;
        changeApprover = _changeApprover;
    }

    // Proponer un nuevo cambio
    function proposeChange(string memory _description, string memory _documentHash) public {
        ChangeEntry memory newChange = ChangeEntry({
            id: nextChangeId,
            description: _description,
            documentHash: _documentHash,
            proposer: msg.sender,
            approver: address(0),
            status: Status.Proposed,
            timestamp: block.timestamp,
            comment: ""
        });

        changes[nextChangeId] = newChange;
        userChanges[msg.sender].push(nextChangeId);
        changeList.push(newChange);

        emit ChangeProposed(nextChangeId, msg.sender);
        nextChangeId++;
    }

    // Aprobar un cambio con comentario
    function approveChange(uint _id, string memory _comment) public onlyChangeApprover {
        require(changes[_id].status == Status.Proposed, "El cambio no esta en estado 'Proposed'");
        changes[_id].status = Status.Approved;
        changes[_id].approver = msg.sender;
        changes[_id].comment = _comment;
        emit ChangeApproved(_id, msg.sender, _comment);
    }

    // Rechazar un cambio con comentario
    function rejectChange(uint _id, string memory _comment) public onlyChangeApprover {
        require(changes[_id].status == Status.Proposed, "El cambio no esta en estado 'Proposed'");
        changes[_id].status = Status.Rejected;
        changes[_id].approver = msg.sender;
        changes[_id].comment = _comment;
        emit ChangeRejected(_id, msg.sender, _comment);
    }

    // Cerrar un cambio aprobado
    function closeChange(uint _id) public onlyProjectManager {
        require(changes[_id].status == Status.Approved, "Solo cambios aprobados pueden cerrarse");
        changes[_id].status = Status.Closed;
        emit ChangeClosed(_id);
    }

    // Obtener detalles completos de un cambio
    function getChange(uint _id) public view returns (
        uint, string memory, string memory, address, address, Status, uint, string memory
    ) {
        ChangeEntry memory c = changes[_id];
        return (
            c.id,
            c.description,
            c.documentHash,
            c.proposer,
            c.approver,
            c.status,
            c.timestamp,
            c.comment
        );
    }

    // Obtener lista de cambios por usuario
    function getUserChanges(address _user) public view returns (uint[] memory) {
        return userChanges[_user];
    }

    // Obtener todos los cambios (listado completo)
    function getAllChanges() public view returns (ChangeEntry[] memory) {
        return changeList;
    }
}

