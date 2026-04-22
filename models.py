from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
import pytz


class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)

BRAZIL_TZ = pytz.timezone('America/Sao_Paulo')

def get_brazil_time():
    return datetime.now(BRAZIL_TZ)


class Produto(db.Model):
    __tablename__ = 'produtos'
    
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(100), unique=True, nullable=False)
    quantidade = db.Column(db.Integer, nullable=False, default=0)
    estoque_inicial = db.Column(db.Integer, nullable=True)
    descricao = db.Column(db.Text, nullable=False)
    embalagem = db.Column(db.String(200), nullable=False)
    valor = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=get_brazil_time)
    updated_at = db.Column(db.DateTime, default=get_brazil_time, onupdate=get_brazil_time)
    
    movimentacoes = db.relationship('Movimentacao', backref='produto', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'codigo': self.codigo,
            'quantidade': self.quantidade,
            'estoque_inicial': self.estoque_inicial,
            'descricao': self.descricao,
            'embalagem': self.embalagem,
            'valor': float(self.valor)
        }


class Movimentacao(db.Model):
    __tablename__ = 'movimentacoes'
    
    id = db.Column(db.Integer, primary_key=True)
    produto_id = db.Column(db.Integer, db.ForeignKey('produtos.id'), nullable=False)
    tipo = db.Column(db.String(20), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False)
    estoque_apos = db.Column(db.Integer, nullable=False)
    observacao = db.Column(db.Text)
    data = db.Column(db.DateTime, default=get_brazil_time, nullable=False)
    
    def to_dict(self):
        produto = Produto.query.get(self.produto_id)
        data_brasil = self.data
        if data_brasil.tzinfo is None:
            data_brasil = pytz.utc.localize(data_brasil).astimezone(BRAZIL_TZ)
        else:
            data_brasil = data_brasil.astimezone(BRAZIL_TZ)
        
        return {
            'id': self.id,
            'codigo': produto.codigo if produto else '',
            'descricao': produto.descricao if produto else '',
            'estoqueInicial': produto.estoque_inicial if produto else None,
            'tipo': self.tipo,
            'quantidade': self.quantidade,
            'estoqueApos': self.estoque_apos,
            'observacao': self.observacao,
            'data': data_brasil.strftime('%Y-%m-%dT%H:%M:%S')
        }
