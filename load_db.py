import os
import csv
from datetime import datetime
from main import app
from models import db, Produto, Movimentacao

def load_data():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("Set DATABASE_URL before running.")
        return

    with app.app_context():
        db.create_all()
        
        # Clear existing data to force reload from CSV
        print("Clearing existing data...")
        Movimentacao.query.delete()
        Produto.query.delete()
        db.session.commit()

        print("Importing products...")
        with open('banco_genius/produtos.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # 8,2028-G,1700,1800,"MANG EXTRAFLEX LARANJA 1/2"" 300M FORTRAL",300,2.11,2025-10-16 14:56:24.299346,2025-10-24 13:05:15.903999
                try:
                    created_at = datetime.strptime(row['CRIADO_EM'], '%Y-%m-%d %H:%M:%S.%f') if row['CRIADO_EM'] else None
                except ValueError:
                    created_at = None
                    
                try:
                    updated_at = datetime.strptime(row['ATUALIZADO_EM'], '%Y-%m-%d %H:%M:%S.%f') if row['ATUALIZADO_EM'] else None
                except ValueError:
                    updated_at = None

                produto = Produto(
                    id=int(row['ID']),
                    codigo=row['CODIGO'],
                    quantidade=int(row['QUANTIDADE']),
                    estoque_inicial=int(row['ESTOQUE_INICIAL']) if row['ESTOQUE_INICIAL'] else None,
                    descricao=row['DESCRICAO'],
                    embalagem=row['EMBALAGEM'],
                    valor=float(row['VALOR']),
                    created_at=created_at,
                    updated_at=updated_at
                )
                db.session.add(produto)
        
        db.session.commit()
        print("Products imported.")

        print("Importing movments...")
        with open('banco_genius/movimentacoes.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # 5,6190-G,"MANG DUPLAF VD FOSCA1/2X2,0 300M FORTRAL",entrada,10,2960,Teste fuso horário Brasil,2025-12-04 19:14:01.954559
                # Find product id by CODIGO
                produto = Produto.query.filter_by(codigo=row['CODIGO']).first()
                if not produto:
                    print(f"Product {row['CODIGO']} not found for movement.")
                    continue
                
                try:
                    data = datetime.strptime(row['DATA'], '%Y-%m-%d %H:%M:%S.%f') if row['DATA'] else None
                except ValueError:
                    data = None

                mov = Movimentacao(
                    id=int(row['ID']),
                    produto_id=produto.id,
                    tipo=row['TIPO'],
                    quantidade=int(row['QUANTIDADE']),
                    estoque_apos=int(row['ESTOQUE_APOS']),
                    observacao=row['OBSERVACAO'],
                    data=data
                )
                db.session.add(mov)
        
        db.session.commit()
        print("Movements imported.")
        print("Database loaded successfully.")

if __name__ == '__main__':
    load_data()
