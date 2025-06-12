// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Bitacora de Cambios (Change Log) PM2
 * @notice Gestion de cambios segun la metodologia PM²
 * @dev Control de roles, multisig simplificado y optimizaciones de gas
 */
contract ChangeLog is AccessControl {
    // ————————————————
    // Roles
    // ————————————————
    bytes32 public constant PROJECT_MANAGER_ROLE = keccak256("PROJECT_MANAGER_ROLE");
    bytes32 public constant CHANGE_APPROVER_ROLE = keccak256("CHANGE_APPROVER_ROLE");

    // ————————————————
    // Configuración inmutable
    // ————————————————
    /// @notice Cantidad minima de votos positivos para aprobar
    uint256 public immutable requiredApprovals;
    /// @notice Periodo (segundos) en que puede votarse tras la propuesta
    uint256 public immutable approvalPeriod;

    // ————————————————
    // Tipo y estructura principal
    // ————————————————
    /// @notice Estado de cada solicitud de cambio
    enum Status { Proposed, Approved, Rejected, Closed }

    /// @notice Registro completo de un cambio
    struct ChangeEntry {
        uint256 id;
        string description;
        string documentHash;
        address proposer;
        Status status;
        uint256 timestamp;
        address[] approvers;
        string[]  approverComments;
        address[] reopeners;
        string[]  reopenComments;
        uint256[] reopenTimestamps;
    }

    // ————————————————
    // Almacenamiento
    // ————————————————
    mapping(uint256 => ChangeEntry) private changes;
    uint256[]                private changeIds;
    mapping(address => uint256[]) private userChanges;
    mapping(uint256 => mapping(address => bool)) private hasApproved;

    // ————————————————
    // Errores personalizados (ahorro de gas vs require string)
    // ————————————————
    error SoloProposed();
    error FueraDePlazo();
    error YaVoto();
    error DescripcionVacia();
    error HashVacio();
    error NoApproved();
    error SoloClosed();
    error AprobadoresInsuficientes();

    // ————————————————
    // Eventos (indexamos hasta 2 campos para facilitar Búsqueda en logs)
    // ————————————————
    event ChangeProposed(
        uint256 indexed id,
        address indexed proposer
    );
    event ChangeApprovalReceived(
        uint256 indexed id,
        address indexed approver,
        string comment,
        uint256 totalApprovals
    );
    event ChangeApproved(uint256 indexed id);
    event ChangeRejected(
        uint256 indexed id,
        address indexed rejector,
        string comment
    );
    event ChangeClosed(uint256 indexed id);
    event ChangeReopened(
        uint256 indexed id,
        address indexed reopener,
        string reason
    );
    event ChangeQueried(
        uint256 indexed id,
        address indexed requester
    );

    // ————————————————
    // Constructor
    // ————————————————
    /**
     * @param initialApprovers Direcciones iniciales con rol de aprobador
     * @param _requiredApprovals Numero minimo de votos para aprobar
     * @param _approvalPeriodDays    Periodo para votar (en dias)
     */
    constructor(
        address[] memory initialApprovers,
        uint256 _requiredApprovals,
        uint256 _approvalPeriodDays
    ) {
        if (initialApprovers.length < _requiredApprovals) revert AprobadoresInsuficientes();

        // Owner = administrador y gestor de proyecto
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PROJECT_MANAGER_ROLE, msg.sender);

        requiredApprovals = _requiredApprovals;
        approvalPeriod   = _approvalPeriodDays * 1 days;

        // Asignar rol de aprobador
        for (uint256 i = 0; i < initialApprovers.length; ) {
            _grantRole(CHANGE_APPROVER_ROLE, initialApprovers[i]);
            unchecked { ++i; }
        }
    }

    // ————————————————
    // Funciones de negocio
    // ————————————————

    /// @notice Proponer un nuevo cambio
    /// @param _description Descripción del cambio (no vacía)
    /// @param _documentHash Hash del documento de respaldo (no vacío)
    function proposeChange(
        string calldata _description,
        string calldata _documentHash
    ) external {
        if (bytes(_description).length == 0)    revert DescripcionVacia();
        if (bytes(_documentHash).length == 0)   revert HashVacio();

        uint256 id = changeIds.length;
        ChangeEntry storage e = changes[id];
        e.id           = id;
        e.description  = _description;
        e.documentHash = _documentHash;
        e.proposer     = msg.sender;
        e.status       = Status.Proposed;
        e.timestamp    = block.timestamp;

        changeIds.push(id);
        userChanges[msg.sender].push(id);

        emit ChangeProposed(id, msg.sender);
    }

    /// @notice Votar a favor de un cambio pendiente
    /// @param _id      Identificador del cambio
    /// @param _comment Comentario justificativo
    function approveChange(
        uint256 _id,
        string calldata _comment
    ) external onlyRole(CHANGE_APPROVER_ROLE) {
        ChangeEntry storage e = changes[_id];
        if (e.status != Status.Proposed)          revert SoloProposed();
        if (block.timestamp > e.timestamp + approvalPeriod) revert FueraDePlazo();
        if (hasApproved[_id][msg.sender])         revert YaVoto();

        hasApproved[_id][msg.sender] = true;
        e.approvers.push(msg.sender);
        e.approverComments.push(_comment);

        uint256 votes = e.approvers.length;
        emit ChangeApprovalReceived(_id, msg.sender, _comment, votes);

        if (votes >= requiredApprovals) {
            e.status = Status.Approved;
            emit ChangeApproved(_id);
        }
    }

    /// @notice Rechazar un cambio pendiente
    /// @param _id      Identificador del cambio
    /// @param _comment Comentario justificativo
    function rejectChange(
        uint256 _id,
        string calldata _comment
    ) external onlyRole(CHANGE_APPROVER_ROLE) {
        ChangeEntry storage e = changes[_id];
        if (e.status != Status.Proposed)          revert SoloProposed();
        if (block.timestamp > e.timestamp + approvalPeriod) revert FueraDePlazo();
        if (hasApproved[_id][msg.sender])         revert YaVoto();

        hasApproved[_id][msg.sender] = true;
        e.status       = Status.Rejected;
        e.approvers.push(msg.sender);
        e.approverComments.push(_comment);

        emit ChangeRejected(_id, msg.sender, _comment);
    }

    /// @notice Cerrar un cambio ya aprobado
    /// @param _id Identificador del cambio
    function closeChange(uint256 _id) external onlyRole(PROJECT_MANAGER_ROLE) {
        ChangeEntry storage e = changes[_id];
        if (e.status != Status.Approved) revert NoApproved();
        e.status = Status.Closed;
        emit ChangeClosed(_id);
    }

    /// @notice Reabrir un cambio previamente cerrado
    /// @param _id     Identificador del cambio
    /// @param _reason Motivo de la reapertura
    function reopenChange(
        uint256 _id,
        string calldata _reason
    ) external onlyRole(CHANGE_APPROVER_ROLE) {
        ChangeEntry storage e = changes[_id];
        if (e.status != Status.Closed) revert SoloClosed();

        // Limpiar votos antiguos
        for (uint256 i = 0; i < e.approvers.length; ) {
            hasApproved[_id][e.approvers[i]] = false;
            unchecked { ++i; }
        }
        delete e.approvers;
        delete e.approverComments;

        // Marcar como "Proposed" de nuevo
        e.status    = Status.Proposed;
        e.timestamp = block.timestamp;

        e.reopeners.push(msg.sender);
        e.reopenComments.push(_reason);
        e.reopenTimestamps.push(block.timestamp);

        emit ChangeReopened(_id, msg.sender, _reason);
    }

    /// @notice Consultar un cambio y emitir evento de auditoría
    /// @param _id Identificador del cambio
    function queryChange(uint256 _id)
        external
        onlyRole(PROJECT_MANAGER_ROLE)
        returns (ChangeEntry memory entry)
    {
        entry = changes[_id];
        emit ChangeQueried(_id, msg.sender);
    }

    // ————————————————
    // Lectura (view, sin gas)
    // ————————————————

    /// @notice Obtener todos los datos de un cambio
    function getChange(uint256 _id) external view returns (ChangeEntry memory) {
        return changes[_id];
    }

    /// @notice Obtener la lista de todos los IDs de cambios
    function getAllChangeIds() external view returns (uint256[] memory) {
        return changeIds;
    }

    /// @notice Obtener los cambios propuestos por un usuario
    function getUserChangeIds(address _user) external view returns (uint256[] memory) {
        return userChanges[_user];
    }

    /// @notice Contar cuántos cambios están en un estado dado
    function countChangesByStatus(Status _status) external view returns (uint256 count) {
        uint256 len = changeIds.length;
        for (uint256 i = 0; i < len; ) {
            if (changes[changeIds[i]].status == _status) {
                unchecked { ++count; }
            }
            unchecked { ++i; }
        }
    }

    /// @notice Listar IDs de cambios en un estado dado
    function listChangesByStatus(Status _status) external view returns (uint256[] memory result) {
        uint256 len   = changeIds.length;
        uint256 total;
        for (uint256 i = 0; i < len; ) {
            if (changes[changeIds[i]].status == _status) {
                unchecked { ++total; }
            }
            unchecked { ++i; }
        }
        result = new uint256[](total);
        uint256 j;
        for (uint256 i = 0; i < len; ) {
            if (changes[changeIds[i]].status == _status) {
                result[j] = changeIds[i];
                unchecked { ++j; }
            }
            unchecked { ++i; }
        }
    }

    // ————————————————
    // Compatibilidad ERC165 para AccessControl
    // ————————————————
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ————————————————
    // Bloquear recepción de ETH
    // ————————————————
    receive() external payable {
        revert();
    }
    fallback() external payable {
        revert();
    }
}
