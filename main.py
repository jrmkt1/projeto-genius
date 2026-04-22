import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from sqlalchemy.orm import joinedload
from models import db, Produto, Movimentacao


app = Flask(__name__, static_folder='.')
CORS(app)

app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "comercial-genius-secret-key-2025"

# Validar DATABASE_URL ou POSTGRES_URL (Vercel)
database_url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
if not database_url:
    raise RuntimeError("DATABASE_URL ou POSTGRES_URL environment variable is not set")

# SQLAlchemy 1.4+ exige 'postgresql://' no lugar de 'postgres://'
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

db.init_app(app)

# Inicialização do banco com tratamento de erro
try:
    with app.app_context():
        db.create_all()
        print("✅ Tabelas do banco de dados criadas/verificadas")
        
        # Inicializar produtos se banco estiver vazio
        if Produto.query.count() == 0:
            produtos_iniciais = [
                Produto(codigo='000070049', quantidade=3000, descricao='MANG DUPLAF VD FOSCA1/2X2,0 300M FORTRAL', embalagem='300', valor=1.66),
                Produto(codigo='000090711', quantidade=1500, descricao='MANG EXTRAFLEX AZUL 1/2" 300M FORTRAL', embalagem='300', valor=2.11),
                Produto(codigo='000090719', quantidade=1800, descricao='MANG EXTRAFLEX LARANJA 1/2" 300M FORTRAL', embalagem='300', valor=2.11),
                Produto(codigo='000006438', quantidade=2000, descricao='MANG LUXO JARDIM 1/2X2,7 VERDE FOSCA (TOPGARDEN 1/2X3,0 FORTRAL) 200M', embalagem='200', valor=3.18),
                Produto(codigo='000080195', quantidade=3000, descricao='MANG SUPREMA 1/2 X 2,5 VERM 250 FORTRAL', embalagem='250', valor=2.89)
            ]
            for p in produtos_iniciais:
                db.session.add(p)
            db.session.commit()
            print(f"✅ {len(produtos_iniciais)} produtos inicializados no banco de dados")
        else:
            print(f"✅ Banco já possui {Produto.query.count()} produtos")
except Exception as e:
    print(f"❌ Erro ao inicializar banco de dados: {e}")
    raise


@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'database': 'connected'}), 200


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)


@app.route('/api/produtos', methods=['GET'])
def get_produtos():
    produtos = Produto.query.all()
    return jsonify([p.to_dict() for p in produtos])


@app.route('/api/produtos', methods=['POST'])
def create_produto():
    data = request.json
    
    existing = Produto.query.filter_by(codigo=data['codigo']).first()
    if existing:
        return jsonify({'error': 'Produto com este código já existe'}), 400
    
    produto = Produto(
        codigo=data['codigo'],
        quantidade=data['quantidade'],
        descricao=data['descricao'],
        embalagem=data['embalagem'],
        valor=data['valor']
    )
    
    db.session.add(produto)
    db.session.commit()
    
    return jsonify(produto.to_dict()), 201


@app.route('/api/produtos/<int:produto_id>', methods=['PUT'])
def update_produto(produto_id):
    produto = Produto.query.get_or_404(produto_id)
    data = request.json
    
    if 'codigo' in data and data['codigo'] != produto.codigo:
        existing = Produto.query.filter_by(codigo=data['codigo']).first()
        if existing:
            return jsonify({'error': 'Produto com este código já existe'}), 400
    
    produto.codigo = data.get('codigo', produto.codigo)
    produto.quantidade = data.get('quantidade', produto.quantidade)
    produto.descricao = data.get('descricao', produto.descricao)
    produto.embalagem = data.get('embalagem', produto.embalagem)
    produto.valor = data.get('valor', produto.valor)
    
    db.session.commit()
    
    return jsonify(produto.to_dict())


@app.route('/api/produtos/<int:produto_id>', methods=['DELETE'])
def delete_produto(produto_id):
    produto = Produto.query.get_or_404(produto_id)
    db.session.delete(produto)
    db.session.commit()
    
    return '', 204


@app.route('/api/movimentacoes', methods=['GET'])
def get_movimentacoes():
    try:
        movimentacoes = Movimentacao.query.options(joinedload(Movimentacao.produto)).order_by(Movimentacao.data.desc()).all()
        return jsonify([m.to_dict() for m in movimentacoes])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/movimentacoes', methods=['POST'])
def create_movimentacao():
    data = request.json
    
    try:
        produto = Produto.query.filter_by(codigo=data['codigo']).with_for_update().first()
        if not produto:
            return jsonify({'error': 'Produto não encontrado'}), 404
        
        quantidade = data['quantidade']
        tipo = data['tipo']
        
        if tipo == 'saida' and produto.quantidade < quantidade:
            db.session.rollback()
            return jsonify({'error': 'Quantidade em estoque insuficiente'}), 400
        
        if tipo == 'entrada':
            produto.quantidade += quantidade
        else:
            produto.quantidade -= quantidade
        
        movimentacao = Movimentacao(
            produto_id=produto.id,
            tipo=tipo,
            quantidade=quantidade,
            estoque_apos=produto.quantidade,
            observacao=data.get('observacao', '')
        )
        
        db.session.add(movimentacao)
        db.session.commit()
        
        return jsonify(movimentacao.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Erro ao criar movimentação: {str(e)}')
        return jsonify({'error': 'Erro ao processar movimentação'}), 500


@app.route('/api/movimentacoes/<int:movimentacao_id>', methods=['PUT'])
def update_movimentacao(movimentacao_id):
    movimentacao = Movimentacao.query.get_or_404(movimentacao_id)
    data = request.json
    
    try:
        produto = Produto.query.get(movimentacao.produto_id)
        if not produto:
            return jsonify({'error': 'Produto não encontrado'}), 404
        
        old_tipo = movimentacao.tipo
        old_quantidade = movimentacao.quantidade
        new_tipo = data.get('tipo', old_tipo)
        new_quantidade = data.get('quantidade', old_quantidade)
        
        if old_tipo == 'entrada':
            produto.quantidade -= old_quantidade
        else:
            produto.quantidade += old_quantidade
        
        if new_tipo == 'saida' and produto.quantidade < new_quantidade:
            db.session.rollback()
            return jsonify({'error': 'Quantidade em estoque insuficiente'}), 400
        
        if new_tipo == 'entrada':
            produto.quantidade += new_quantidade
        else:
            produto.quantidade -= new_quantidade
        
        movimentacao.tipo = new_tipo
        movimentacao.quantidade = new_quantidade
        movimentacao.estoque_apos = produto.quantidade
        movimentacao.observacao = data.get('observacao', movimentacao.observacao)
        
        db.session.commit()
        
        return jsonify(movimentacao.to_dict())
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Erro ao atualizar movimentação: {str(e)}')
        return jsonify({'error': 'Erro ao processar atualização'}), 500


@app.route('/api/movimentacoes/<int:movimentacao_id>', methods=['DELETE'])
def delete_movimentacao(movimentacao_id):
    movimentacao = Movimentacao.query.get_or_404(movimentacao_id)
    
    try:
        produto = Produto.query.get(movimentacao.produto_id)
        if not produto:
            return jsonify({'error': 'Produto não encontrado'}), 404
        
        if movimentacao.tipo == 'entrada':
            produto.quantidade -= movimentacao.quantidade
        else:
            produto.quantidade += movimentacao.quantidade
        
        if produto.quantidade < 0:
            db.session.rollback()
            return jsonify({'error': 'Não é possível excluir esta movimentação (estoque ficaria negativo)'}), 400
        
        db.session.delete(movimentacao)
        db.session.commit()
        
        return '', 204
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Erro ao excluir movimentação: {str(e)}')
        return jsonify({'error': 'Erro ao processar exclusão'}), 500


@app.route('/api/produtos/seed', methods=['POST'])
def seed_produtos():
    count = Produto.query.count()
    if count > 0:
        return jsonify({'message': 'Banco já possui produtos'}), 200
    
    produtos_iniciais = [
        {
            'codigo': '000070049',
            'quantidade': 3000,
            'descricao': 'MANG DUPLAF VD FOSCA1/2X2,0 300M FORTRAL',
            'embalagem': '300',
            'valor': 1.66
        },
        {
            'codigo': '000090711',
            'quantidade': 1500,
            'descricao': 'MANG EXTRAFLEX AZUL 1/2" 300M FORTRAL',
            'embalagem': '300',
            'valor': 2.11
        },
        {
            'codigo': '000090719',
            'quantidade': 1800,
            'descricao': 'MANG EXTRAFLEX LARANJA 1/2" 300M FORTRAL',
            'embalagem': '300',
            'valor': 2.11
        },
        {
            'codigo': '000006438',
            'quantidade': 2000,
            'descricao': 'MANG LUXO JARDIM 1/2X2,7 VERDE FOSCA (TOPGARDEN 1/2X3,0 FORTRAL) 200M',
            'embalagem': '200',
            'valor': 3.18
        },
        {
            'codigo': '000080195',
            'quantidade': 3000,
            'descricao': 'MANG SUPREMA 1/2 X 2,5 VERM 250 FORTRAL',
            'embalagem': '250',
            'valor': 2.89
        }
    ]
    
    for p_data in produtos_iniciais:
        produto = Produto(**p_data)
        db.session.add(produto)
    
    db.session.commit()
    
    return jsonify({'message': f'{len(produtos_iniciais)} produtos criados com sucesso'}), 201


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
