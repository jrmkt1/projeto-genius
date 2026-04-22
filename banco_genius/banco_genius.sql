-- ============================================
-- EXPORTAÇÃO DO BANCO DE DADOS
-- Sistema de Controle e Cadastro de Produtos
-- Comercial Genius
-- ============================================

-- TABELA: produtos
CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(100) UNIQUE NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 0,
    estoque_inicial INTEGER,
    descricao TEXT NOT NULL,
    embalagem VARCHAR(200) NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- TABELA: movimentacoes
CREATE TABLE IF NOT EXISTS movimentacoes (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER REFERENCES produtos(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL,
    quantidade INTEGER NOT NULL,
    estoque_apos INTEGER NOT NULL,
    observacao TEXT,
    data TIMESTAMP
);

-- DADOS: produtos
INSERT INTO produtos (id, codigo, quantidade, estoque_inicial, descricao, embalagem, valor, created_at, updated_at) VALUES (6, '6190-G', 2960, 3000, 'MANG DUPLAF VD FOSCA1/2X2,0 300M FORTRAL', '300', 1.66, '2025-10-16 14:56:24.299346', '2025-12-04 19:14:01.930158');
INSERT INTO produtos (id, codigo, quantidade, estoque_inicial, descricao, embalagem, valor, created_at, updated_at) VALUES (7, '2029-G', 1500, 1500, 'MANG EXTRAFLEX AZUL 1/2" 300M FORTRAL', '300', 2.11, '2025-10-16 14:56:24.299346', '2025-10-16 15:00:38.338837');
INSERT INTO produtos (id, codigo, quantidade, estoque_inicial, descricao, embalagem, valor, created_at, updated_at) VALUES (8, '2028-G', 1700, 1800, 'MANG EXTRAFLEX LARANJA 1/2" 300M FORTRAL', '300', 2.11, '2025-10-16 14:56:24.299346', '2025-10-24 13:05:15.903999');
INSERT INTO produtos (id, codigo, quantidade, estoque_inicial, descricao, embalagem, valor, created_at, updated_at) VALUES (9, '8318-G', 1900, 2000, 'MANG TOPGARDEN 1/2X3,0 200M GNS', '200', 3.18, '2025-10-16 14:56:24.299346', '2025-10-23 20:04:34.515224');
INSERT INTO produtos (id, codigo, quantidade, estoque_inicial, descricao, embalagem, valor, created_at, updated_at) VALUES (10, '6159-G', 3100, 3000, 'MANG SUPREMA 1/2 X 2,5 VERM 250 FORTRAL', '250', 2.89, '2025-10-16 14:56:24.299346', '2025-10-24 12:21:51.715608');
INSERT INTO produtos (id, codigo, quantidade, estoque_inicial, descricao, embalagem, valor, created_at, updated_at) VALUES (11, '8554', 101, 101, 'GRELHA INOX C/ABA 10X100 FORTRAL', 'UN', 0.00, NULL, NULL);
INSERT INTO produtos (id, codigo, quantidade, estoque_inicial, descricao, embalagem, valor, created_at, updated_at) VALUES (12, '8571', 33, 33, 'GRELHA C/CX COLET.INOX 10X100 FORTRAL', 'UN', 0.00, NULL, NULL);

-- DADOS: movimentacoes
INSERT INTO movimentacoes (id, produto_id, tipo, quantidade, estoque_apos, observacao, data) VALUES (1, 9, 'saida', 100, 1900, 'Teste de baixa', '2025-10-23 20:04:34.537365');
INSERT INTO movimentacoes (id, produto_id, tipo, quantidade, estoque_apos, observacao, data) VALUES (2, 6, 'saida', 50, 2950, 'Teste de demonstração', '2025-10-23 20:57:56.165426');
INSERT INTO movimentacoes (id, produto_id, tipo, quantidade, estoque_apos, observacao, data) VALUES (3, 10, 'entrada', 100, 3100, 'Teste de entrada', '2025-10-24 12:21:51.739862');
INSERT INTO movimentacoes (id, produto_id, tipo, quantidade, estoque_apos, observacao, data) VALUES (4, 8, 'saida', 100, 1700, 'Venda para cliente', '2025-10-24 13:05:15.923210');
INSERT INTO movimentacoes (id, produto_id, tipo, quantidade, estoque_apos, observacao, data) VALUES (5, 6, 'entrada', 10, 2960, 'Teste fuso horário Brasil', '2025-12-04 19:14:01.954559');

-- Fim da exportação
