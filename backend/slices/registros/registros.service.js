const repo = require('./registros.repository');

function historialPorNino(idNino, limit = 50) {
    return repo.historialPorNino(idNino, limit);
}

function historialPorSalon(idSalon, limit = 50) {
    return repo.historialPorSalon(idSalon, limit);
}

function buscarModuloPorEmocion(emocion) {
    return repo.buscarModuloPorEmocion(emocion);
}

function insertarRegistro(payload) {
    return repo.insertarRegistro(payload);
}

module.exports = {
    historialPorNino,
    historialPorSalon,
    buscarModuloPorEmocion,
    insertarRegistro,
};
