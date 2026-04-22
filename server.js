const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const dbFile = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbFile);

// Initialize DB
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE NOT NULL,
        quantidade INTEGER NOT NULL DEFAULT 0,
        estoque_inicial INTEGER,
        descricao TEXT NOT NULL,
        embalagem TEXT NOT NULL,
        valor REAL NOT NULL,
        created_at TEXT,
        updated_at TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS movimentacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        estoque_apos INTEGER NOT NULL,
        observacao TEXT,
        data TEXT,
        FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
    )`);

    // Load CSV if products table is empty
    db.get("SELECT COUNT(*) AS count FROM produtos", (err, row) => {
        if (!err && row.count === 0) {
            console.log("Loading initial data from CSV...");
            
            try {
                // Load products
                const produtosCsv = fs.readFileSync(path.join(__dirname, 'banco_genius', 'produtos.csv'), 'utf8');
                const produtos = parse(produtosCsv, { columns: true, skip_empty_lines: true });
                
                const insertProd = db.prepare("INSERT INTO produtos (id, codigo, quantidade, estoque_inicial, descricao, embalagem, valor, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                produtos.forEach(p => {
                    insertProd.run(
                        parseInt(p.ID), p.CODIGO, parseInt(p.QUANTIDADE), 
                        p.ESTOQUE_INICIAL ? parseInt(p.ESTOQUE_INICIAL) : null,
                        p.DESCRICAO, p.EMBALAGEM, parseFloat(p.VALOR),
                        p.CRIADO_EM || null, p.ATUALIZADO_EM || null
                    );
                });
                insertProd.finalize();

                // Load movements
                const movsCsv = fs.readFileSync(path.join(__dirname, 'banco_genius', 'movimentacoes.csv'), 'utf8');
                const movs = parse(movsCsv, { columns: true, skip_empty_lines: true });
                
                db.all("SELECT id, codigo FROM produtos", (err, rows) => {
                    if (err) return;
                    const prodMap = {};
                    rows.forEach(r => prodMap[r.codigo] = r.id);

                    const insertMov = db.prepare("INSERT INTO movimentacoes (id, produto_id, tipo, quantidade, estoque_apos, observacao, data) VALUES (?, ?, ?, ?, ?, ?, ?)");
                    movs.forEach(m => {
                        const prodId = prodMap[m.CODIGO];
                        if (prodId) {
                            insertMov.run(
                                parseInt(m.ID), prodId, m.TIPO, parseInt(m.QUANTIDADE),
                                parseInt(m.ESTOQUE_APOS), m.OBSERVACAO, m.DATA || null
                            );
                        }
                    });
                    insertMov.finalize();
                    console.log("Initial data loaded successfully.");
                });
            } catch (e) {
                console.error("Error loading CSV:", e);
            }
        }
    });
});

app.get('/health', (req, res) => res.json({ status: 'ok', database: 'connected' }));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const getBrazilTime = () => new Date().toISOString();

// API Produtos
app.get('/api/produtos', (req, res) => {
    db.all("SELECT * FROM produtos", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/produtos', (req, res) => {
    const { codigo, quantidade, descricao, embalagem, valor } = req.body;
    db.get("SELECT id FROM produtos WHERE codigo = ?", [codigo], (err, row) => {
        if (row) return res.status(400).json({ error: 'Produto com este código já existe' });
        
        const sql = `INSERT INTO produtos (codigo, quantidade, descricao, embalagem, valor, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const now = getBrazilTime();
        db.run(sql, [codigo, quantidade, descricao, embalagem, valor, now, now], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID, codigo, quantidade, descricao, embalagem, valor, estoque_inicial: null });
        });
    });
});

app.put('/api/produtos/:id', (req, res) => {
    const id = req.params.id;
    const { codigo, quantidade, descricao, embalagem, valor } = req.body;
    
    db.get("SELECT codigo FROM produtos WHERE id = ?", [id], (err, currentProd) => {
        if (!currentProd) return res.status(404).json({ error: 'Not found' });
        
        if (codigo && codigo !== currentProd.codigo) {
            db.get("SELECT id FROM produtos WHERE codigo = ?", [codigo], (err, row) => {
                if (row) return res.status(400).json({ error: 'Produto com este código já existe' });
                updateProd();
            });
        } else {
            updateProd();
        }
        
        function updateProd() {
            db.run(`UPDATE produtos SET codigo = COALESCE(?, codigo), quantidade = COALESCE(?, quantidade), 
                    descricao = COALESCE(?, descricao), embalagem = COALESCE(?, embalagem), 
                    valor = COALESCE(?, valor), updated_at = ? WHERE id = ?`,
                [codigo, quantidade, descricao, embalagem, valor, getBrazilTime(), id], 
                function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    db.get("SELECT * FROM produtos WHERE id = ?", [id], (err, updated) => res.json(updated));
                }
            );
        }
    });
});

app.delete('/api/produtos/:id', (req, res) => {
    db.run("DELETE FROM produtos WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(204).send();
    });
});

// API Movimentacoes
app.get('/api/movimentacoes', (req, res) => {
    const sql = `
        SELECT m.*, p.codigo, p.descricao, p.estoque_inicial as estoqueInicial 
        FROM movimentacoes m 
        JOIN produtos p ON m.produto_id = p.id 
        ORDER BY m.data DESC
    `;
    db.all(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({
            id: r.id, codigo: r.codigo, descricao: r.descricao, 
            estoqueInicial: r.estoqueInicial, tipo: r.tipo, 
            quantidade: r.quantidade, estoqueApos: r.estoque_apos, 
            observacao: r.observacao, data: r.data
        })));
    });
});

app.post('/api/movimentacoes', (req, res) => {
    const { codigo, tipo, quantidade, observacao } = req.body;
    db.get("SELECT * FROM produtos WHERE codigo = ?", [codigo], (err, produto) => {
        if (!produto) return res.status(404).json({ error: 'Produto não encontrado' });
        
        if (tipo === 'saida' && produto.quantidade < quantidade) {
            return res.status(400).json({ error: 'Quantidade em estoque insuficiente' });
        }
        
        const newQuant = tipo === 'entrada' ? produto.quantidade + quantidade : produto.quantidade - quantidade;
        
        db.run("UPDATE produtos SET quantidade = ? WHERE id = ?", [newQuant, produto.id], err => {
            if (err) return res.status(500).json({ error: err.message });
            
            const now = getBrazilTime();
            db.run(`INSERT INTO movimentacoes (produto_id, tipo, quantidade, estoque_apos, observacao, data) 
                    VALUES (?, ?, ?, ?, ?, ?)`, 
                [produto.id, tipo, quantidade, newQuant, observacao, now], 
                function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.status(201).json({
                        id: this.lastID, codigo: produto.codigo, descricao: produto.descricao,
                        estoqueInicial: produto.estoque_inicial, tipo, quantidade, 
                        estoqueApos: newQuant, observacao, data: now
                    });
                }
            );
        });
    });
});

app.put('/api/movimentacoes/:id', (req, res) => {
    const id = req.params.id;
    const { tipo: newTipo, quantidade: newQuantidade, observacao } = req.body;
    
    db.get("SELECT * FROM movimentacoes WHERE id = ?", [id], (err, mov) => {
        if (!mov) return res.status(404).json({ error: 'Movimentacao not found' });
        
        db.get("SELECT * FROM produtos WHERE id = ?", [mov.produto_id], (err, produto) => {
            if (!produto) return res.status(404).json({ error: 'Produto not found' });
            
            // Revert old movement
            let tempQuant = mov.tipo === 'entrada' ? produto.quantidade - mov.quantidade : produto.quantidade + mov.quantidade;
            
            // Apply new movement
            const applyTipo = newTipo || mov.tipo;
            const applyQuant = newQuantidade !== undefined ? newQuantidade : mov.quantidade;
            
            if (applyTipo === 'saida' && tempQuant < applyQuant) {
                return res.status(400).json({ error: 'Quantidade em estoque insuficiente' });
            }
            
            const finalQuant = applyTipo === 'entrada' ? tempQuant + applyQuant : tempQuant - applyQuant;
            
            db.run("UPDATE produtos SET quantidade = ? WHERE id = ?", [finalQuant, produto.id], err => {
                db.run(`UPDATE movimentacoes SET tipo = ?, quantidade = ?, estoque_apos = ?, observacao = ? WHERE id = ?`,
                    [applyTipo, applyQuant, finalQuant, observacao || mov.observacao, id],
                    function(err) {
                        res.json({ id: parseInt(id), tipo: applyTipo, quantidade: applyQuant, estoqueApos: finalQuant, observacao: observacao || mov.observacao });
                    }
                );
            });
        });
    });
});

app.delete('/api/movimentacoes/:id', (req, res) => {
    const id = req.params.id;
    db.get("SELECT * FROM movimentacoes WHERE id = ?", [id], (err, mov) => {
        if (!mov) return res.status(404).json({ error: 'Not found' });
        
        db.get("SELECT * FROM produtos WHERE id = ?", [mov.produto_id], (err, produto) => {
            if (!produto) return res.status(404).json({ error: 'Produto not found' });
            
            const newQuant = mov.tipo === 'entrada' ? produto.quantidade - mov.quantidade : produto.quantidade + mov.quantidade;
            if (newQuant < 0) return res.status(400).json({ error: 'Estoque ficaria negativo' });
            
            db.run("UPDATE produtos SET quantidade = ? WHERE id = ?", [newQuant, produto.id], err => {
                db.run("DELETE FROM movimentacoes WHERE id = ?", [id], err => {
                    res.status(204).send();
                });
            });
        });
    });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Node.js server running on http://localhost:${PORT}`);
});
