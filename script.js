// Product Management System with Database Backend
class ProductManager {
  constructor() {
    this.products = [];
    this.movements = [];
    this.editingProductId = null;
    this.editingMovementId = null;
    this.currentTab = 'products';
    this.init();
  }

  async init() {
    await this.loadProducts();
    await this.loadMovements();
    this.setupEventListeners();
    this.renderProducts();
    this.updateProductSelect();
  }

  async loadProducts() {
    try {
      const response = await fetch('/api/produtos');
      this.products = await response.json();
      
      if (this.products.length === 0) {
        await this.seedInitialProducts();
        const response = await fetch('/api/produtos');
        this.products = await response.json();
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      alert('Erro ao carregar produtos do banco de dados');
    }
  }

  async seedInitialProducts() {
    try {
      await fetch('/api/produtos/seed', { method: 'POST' });
    } catch (error) {
      console.error('Erro ao criar produtos iniciais:', error);
    }
  }

  async loadMovements() {
    try {
      const response = await fetch('/api/movimentacoes');
      this.movements = await response.json();
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error);
      this.movements = [];
    }
  }

  setupEventListeners() {
    const productForm = document.getElementById('productForm');
    const movementForm = document.getElementById('movementForm');
    const searchInput = document.getElementById('searchInput');
    const cancelBtn = document.getElementById('cancelBtn');
    const movProductCode = document.getElementById('movProductCode');
    const movementFilter = document.getElementById('movementFilter');

    productForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleProductSubmit();
    });

    movementForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleMovementSubmit();
    });

    searchInput.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });

    cancelBtn.addEventListener('click', () => {
      this.cancelEdit();
    });

    movProductCode.addEventListener('change', (e) => {
      this.updateStockInfo(e.target.value);
    });

    movementFilter.addEventListener('change', (e) => {
      this.filterMovements(e.target.value);
    });
  }

  switchTab(tab) {
    this.currentTab = tab;
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (tab === 'products') {
      document.querySelectorAll('.tab-btn')[0].classList.add('active');
      document.getElementById('productsTab').classList.add('active');
    } else if (tab === 'movements') {
      document.querySelectorAll('.tab-btn')[1].classList.add('active');
      document.getElementById('movementsTab').classList.add('active');
      this.renderMovements();
      this.updateProductSelect();
    } else if (tab === 'reports') {
      document.querySelectorAll('.tab-btn')[2].classList.add('active');
      document.getElementById('reportsTab').classList.add('active');
    }
  }

  async handleProductSubmit() {
    const formData = {
      codigo: document.getElementById('codigo').value,
      quantidade: parseInt(document.getElementById('quantidade').value),
      descricao: document.getElementById('descricao').value,
      embalagem: document.getElementById('embalagem').value,
      valor: parseFloat(document.getElementById('valor').value)
    };

    try {
      let response;
      if (this.editingProductId !== null) {
        response = await fetch(`/api/produtos/${this.editingProductId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao atualizar produto');
        }
        
        this.editingProductId = null;
        document.getElementById('submitBtn').textContent = 'Adicionar Produto';
        document.getElementById('cancelBtn').style.display = 'none';
      } else {
        response = await fetch('/api/produtos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao adicionar produto');
        }
      }

      await this.loadProducts();
      this.renderProducts();
      this.updateProductSelect();
      this.resetProductForm();
    } catch (error) {
      alert(error.message);
    }
  }

  async handleMovementSubmit() {
    const codigo = document.getElementById('movProductCode').value;
    const tipo = document.getElementById('movType').value;
    const quantidade = parseInt(document.getElementById('movQuantity').value);
    const observacao = document.getElementById('movObservation').value;

    try {
      let response;
      if (this.editingMovementId !== null) {
        response = await fetch(`/api/movimentacoes/${this.editingMovementId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo,
            quantidade,
            observacao
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao atualizar movimentação');
        }

        this.editingMovementId = null;
        document.querySelector('#movementForm button[type="submit"]').textContent = 'Registrar Movimentação';
      } else {
        const product = this.products.find(p => p.codigo === codigo);
        if (!product) {
          alert('Produto não encontrado!');
          return;
        }

        if (tipo === 'saida' && product.quantidade < quantidade) {
          alert('Quantidade insuficiente em estoque!');
          return;
        }

        response = await fetch('/api/movimentacoes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo,
            tipo,
            quantidade,
            observacao
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao registrar movimentação');
        }
      }

      await this.loadProducts();
      await this.loadMovements();
      this.renderProducts();
      this.renderMovements();
      this.updateStockInfo(codigo);
      this.resetMovementForm();

      alert(`${this.editingMovementId ? 'Movimentação atualizada' : tipo === 'entrada' ? 'Entrada registrada' : 'Saída registrada'} com sucesso!`);
    } catch (error) {
      alert(error.message);
    }
  }

  editMovement(index) {
    const movement = this.movements[index];
    const product = this.products.find(p => p.codigo === movement.codigo);
    
    if (!product) {
      alert('Produto não encontrado!');
      return;
    }

    document.getElementById('movProductCode').value = movement.codigo;
    document.getElementById('movType').value = movement.tipo;
    document.getElementById('movQuantity').value = movement.quantidade;
    document.getElementById('movObservation').value = movement.observacao || '';

    this.editingMovementId = movement.id;
    document.querySelector('#movementForm button[type="submit"]').textContent = 'Atualizar Movimentação';
    
    this.updateStockInfo(movement.codigo);

    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
  }

  async deleteMovement(index) {
    if (confirm('Tem certeza que deseja excluir esta movimentação? O estoque será ajustado automaticamente.')) {
      const movement = this.movements[index];
      try {
        const response = await fetch(`/api/movimentacoes/${movement.id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro ao excluir movimentação');
        }

        await this.loadProducts();
        await this.loadMovements();
        this.renderProducts();
        this.renderMovements();

        alert('Movimentação excluída com sucesso!');
      } catch (error) {
        alert(error.message);
      }
    }
  }

  editProduct(index) {
    const product = this.products[index];
    document.getElementById('codigo').value = product.codigo;
    document.getElementById('quantidade').value = product.quantidade;
    document.getElementById('descricao').value = product.descricao;
    document.getElementById('embalagem').value = product.embalagem;
    document.getElementById('valor').value = product.valor;

    this.editingProductId = product.id;
    document.getElementById('submitBtn').textContent = 'Atualizar Produto';
    document.getElementById('cancelBtn').style.display = 'inline-block';

    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
  }

  async deleteProduct(index) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      const product = this.products[index];
      try {
        const response = await fetch(`/api/produtos/${product.id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          throw new Error('Erro ao excluir produto');
        }

        await this.loadProducts();
        await this.loadMovements();
        this.renderProducts();
        this.updateProductSelect();
      } catch (error) {
        alert(error.message);
      }
    }
  }

  cancelEdit() {
    this.editingProductId = null;
    this.resetProductForm();
    document.getElementById('submitBtn').textContent = 'Adicionar Produto';
    document.getElementById('cancelBtn').style.display = 'none';
  }

  resetProductForm() {
    document.getElementById('productForm').reset();
  }

  resetMovementForm() {
    document.getElementById('movementForm').reset();
    document.getElementById('stockInfo').querySelector('#currentStock').textContent = '-';
    this.editingMovementId = null;
    document.querySelector('#movementForm button[type="submit"]').textContent = 'Registrar Movimentação';
  }

  handleSearch(searchTerm) {
    const term = searchTerm.toLowerCase();
    const filtered = this.products.filter(product => 
      product.codigo.toLowerCase().includes(term) ||
      product.descricao.toLowerCase().includes(term) ||
      product.embalagem.toLowerCase().includes(term)
    );
    this.renderProducts(filtered);
  }

  updateProductSelect() {
    const select = document.getElementById('movProductCode');
    select.innerHTML = '<option value="">Selecione um produto</option>';
    
    this.products.forEach(product => {
      const option = document.createElement('option');
      option.value = product.codigo;
      option.textContent = `${product.codigo} - ${product.descricao}`;
      select.appendChild(option);
    });
  }

  updateStockInfo(codigo) {
    const product = this.products.find(p => p.codigo === codigo);
    const stockSpan = document.getElementById('currentStock');
    
    if (product) {
      stockSpan.textContent = `${this.formatNumber(product.quantidade)} unidades`;
    } else {
      stockSpan.textContent = '-';
    }
  }

  filterMovements(filterType) {
    if (filterType === 'all') {
      this.renderMovements();
    } else {
      const filtered = this.movements.filter(m => m.tipo === filterType);
      this.renderMovements(filtered);
    }
  }

  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  formatNumber(value) {
    return new Intl.NumberFormat('pt-BR').format(value);
  }

  formatDateTime(isoString) {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  renderProducts(productsList = null) {
    const products = productsList || this.products;
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = '';

    products.forEach((product, index) => {
      const originalIndex = this.products.indexOf(product);
      const row = tbody.insertRow();
      const total = product.quantidade * product.valor;

      row.innerHTML = `
        <td>${product.codigo}</td>
        <td>${this.formatNumber(product.quantidade)}</td>
        <td>${product.descricao}</td>
        <td>${product.embalagem}</td>
        <td>${this.formatCurrency(product.valor)}</td>
        <td>${this.formatCurrency(total)}</td>
        <td class="actions">
          <button class="btn btn-edit" onclick="productManager.editProduct(${originalIndex})">Editar</button>
          <button class="btn btn-delete" onclick="productManager.deleteProduct(${originalIndex})">Excluir</button>
        </td>
      `;
    });

    this.updateSummary();
  }

  renderMovements(movementsList = null) {
    const movements = movementsList || this.movements;
    const tbody = document.querySelector('#movementsTable tbody');
    tbody.innerHTML = '';

    if (movements.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Nenhuma movimentação registrada</td></tr>';
      this.updateMovementsSummary();
      return;
    }

    movements.forEach((movement, index) => {
      const originalIndex = this.movements.indexOf(movement);
      const row = tbody.insertRow();
      const badgeClass = movement.tipo === 'entrada' ? 'tipo-entrada' : 'tipo-saida';
      const estoqueInicial = movement.estoqueInicial ? this.formatNumber(movement.estoqueInicial) : '-';

      row.innerHTML = `
        <td>${this.formatDateTime(movement.data)}</td>
        <td>${movement.codigo}</td>
        <td>${movement.descricao}</td>
        <td><strong style="color: #0d7377;">${estoqueInicial}</strong></td>
        <td><span class="badge ${badgeClass}">${movement.tipo.toUpperCase()}</span></td>
        <td>${this.formatNumber(movement.quantidade)}</td>
        <td><strong>${this.formatNumber(movement.estoqueApos)}</strong></td>
        <td>${movement.observacao || '-'}</td>
        <td class="actions">
          <button class="btn btn-edit" onclick="productManager.editMovement(${originalIndex})">Editar</button>
          <button class="btn btn-delete" onclick="productManager.deleteMovement(${originalIndex})">Excluir</button>
        </td>
      `;
    });

    this.updateMovementsSummary();
  }

  updateSummary() {
    const totalQuantity = this.products.reduce((sum, p) => sum + p.quantidade, 0);
    const totalValue = this.products.reduce((sum, p) => sum + (p.quantidade * p.valor), 0);

    document.getElementById('totalProducts').textContent = this.products.length;
    document.getElementById('totalQuantity').textContent = this.formatNumber(totalQuantity);
    document.getElementById('totalValue').textContent = this.formatCurrency(totalValue);
  }

  updateMovementsSummary() {
    const totalMovements = this.movements.length;
    const totalEntradas = this.movements.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + m.quantidade, 0);
    const totalSaidas = this.movements.filter(m => m.tipo === 'saida').reduce((sum, m) => sum + m.quantidade, 0);

    document.getElementById('totalMovements').textContent = totalMovements;
    document.getElementById('totalEntradas').textContent = this.formatNumber(totalEntradas);
    document.getElementById('totalSaidas').textContent = this.formatNumber(totalSaidas);
  }

  generateProductsReport() {
    const reportContent = document.getElementById('reportContent');
    const printButton = document.getElementById('printButton');
    
    const now = new Date();
    const dateStr = this.formatDateTime(now.toISOString());
    
    const totalQuantity = this.products.reduce((sum, p) => sum + p.quantidade, 0);
    const totalValue = this.products.reduce((sum, p) => sum + (p.quantidade * p.valor), 0);
    
    let html = `
      <div class="report-document">
        <div class="report-title">
          <h2>Relatório de Estoque de Produtos</h2>
          <p class="report-date">Data de Emissão: ${dateStr}</p>
        </div>
        
        <table class="report-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>Embalagem</th>
              <th>Quantidade</th>
              <th>Valor Unit.</th>
              <th>Valor Total</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    this.products.forEach(product => {
      const total = product.quantidade * product.valor;
      html += `
        <tr>
          <td>${product.codigo}</td>
          <td>${product.descricao}</td>
          <td>${product.embalagem}</td>
          <td>${this.formatNumber(product.quantidade)}</td>
          <td>${this.formatCurrency(product.valor)}</td>
          <td>${this.formatCurrency(total)}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
          <tfoot>
            <tr>
              <th colspan="3">TOTAIS</th>
              <th>${this.formatNumber(totalQuantity)}</th>
              <th>-</th>
              <th>${this.formatCurrency(totalValue)}</th>
            </tr>
          </tfoot>
        </table>
        
        <div class="report-summary">
          <p><strong>Total de Produtos Cadastrados:</strong> ${this.products.length}</p>
          <p><strong>Quantidade Total em Estoque:</strong> ${this.formatNumber(totalQuantity)}</p>
          <p><strong>Valor Total em Estoque:</strong> ${this.formatCurrency(totalValue)}</p>
        </div>
      </div>
    `;
    
    reportContent.innerHTML = html;
    printButton.style.display = 'block';
  }

  generateMovementsReport() {
    const reportContent = document.getElementById('reportContent');
    const printButton = document.getElementById('printButton');
    
    const now = new Date();
    const dateStr = this.formatDateTime(now.toISOString());
    
    const totalEntradas = this.movements.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + m.quantidade, 0);
    const totalSaidas = this.movements.filter(m => m.tipo === 'saida').reduce((sum, m) => sum + m.quantidade, 0);
    
    let html = `
      <div class="report-document">
        <div class="report-title">
          <h2>Relatório de Movimentações de Estoque</h2>
          <p class="report-date">Data de Emissão: ${dateStr}</p>
        </div>
        
        <table class="report-table">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Código</th>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Quantidade</th>
              <th>Estoque Após</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    if (this.movements.length === 0) {
      html += '<tr><td colspan="7" style="text-align: center;">Nenhuma movimentação registrada</td></tr>';
    } else {
      this.movements.forEach(movement => {
        html += `
          <tr>
            <td>${this.formatDateTime(movement.data)}</td>
            <td>${movement.codigo}</td>
            <td>${movement.descricao}</td>
            <td><span class="badge ${movement.tipo === 'entrada' ? 'tipo-entrada' : 'tipo-saida'}">${movement.tipo.toUpperCase()}</span></td>
            <td>${this.formatNumber(movement.quantidade)}</td>
            <td>${this.formatNumber(movement.estoqueApos)}</td>
            <td>${movement.observacao || '-'}</td>
          </tr>
        `;
      });
    }
    
    html += `
          </tbody>
        </table>
        
        <div class="report-summary">
          <p><strong>Total de Movimentações:</strong> ${this.movements.length}</p>
          <p><strong>Total de Entradas:</strong> ${this.formatNumber(totalEntradas)}</p>
          <p><strong>Total de Saídas:</strong> ${this.formatNumber(totalSaidas)}</p>
        </div>
      </div>
    `;
    
    reportContent.innerHTML = html;
    printButton.style.display = 'block';
  }

  printReport() {
    window.print();
  }
}

let productManager;
document.addEventListener('DOMContentLoaded', () => {
  productManager = new ProductManager();
});
