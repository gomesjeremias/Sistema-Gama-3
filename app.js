import * as db from './db.js';
import { checkAuth, login, logout } from './auth.js';
const { jsPDF } = window.jspdf;
const autoTable = window.jspdf.autoTable;

let vendasProdutoChart;

// Funções de Renderização
function renderClients() {
    const clients = db.getAll('clientes');
    const tableBody = document.getElementById('clientes-table');
    tableBody.innerHTML = '';
    clients.forEach(client => {
        const statusBadge = client.status === 'Pago' ? 'badge-success' : 'badge-warning';
        tableBody.innerHTML += `
            <tr>
                <td>${client.nome}</td>
                <td>${client.email}</td>
                <td>${client.telefone}</td>
                <td><span class="badge ${statusBadge} badge-ghost">${client.status}</span></td>
                <td class="space-x-2">
                    <button class="btn btn-xs btn-outline btn-info edit-client-btn" data-id="${client.id}"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn btn-xs btn-outline btn-error delete-client-btn" data-id="${client.id}"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function renderProducts() {
    const products = db.getAll('produtos');
    const tableBody = document.getElementById('produtos-table');
    tableBody.innerHTML = '';
    products.forEach(product => {
        tableBody.innerHTML += `
            <tr>
                <td>${product.nome}</td>
                <td>${product.codigo}</td>
                <td>${product.descricao}</td>
                <td>${product.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td>${product.estoque}</td>
                <td class="space-x-2">
                    <button class="btn btn-xs btn-outline btn-info edit-product-btn" data-id="${product.id}"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn btn-xs btn-outline btn-error delete-product-btn" data-id="${product.id}"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function renderSuppliers() {
    const suppliers = db.getAll('fornecedores');
    const tableBody = document.getElementById('fornecedores-table');
    tableBody.innerHTML = '';
    suppliers.forEach(supplier => {
        tableBody.innerHTML += `
            <tr>
                <td>${supplier.nome}</td>
                <td>${supplier.cnpj}</td>
                <td>${supplier.contato}</td>
                <td>${supplier.produtos}</td>
                <td class="space-x-2">
                    <button class="btn btn-xs btn-outline btn-info edit-supplier-btn" data-id="${supplier.id}"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn btn-xs btn-outline btn-error delete-supplier-btn" data-id="${supplier.id}"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function renderSales() {
    const sales = db.getAll('vendas');
    const clients = db.getAll('clientes');
    const products = db.getAll('produtos');
    const tableBody = document.getElementById('vendas-table');
    tableBody.innerHTML = '';

    // Criar mapas para acesso rápido
    const clientMap = new Map(clients.map(c => [c.id, c.nome]));
    const productMap = new Map(products.map(p => [p.id, p.nome]));

    sales.forEach(sale => {
        const statusBadge = sale.status === 'Pago' ? 'badge-success' : 'badge-warning';
        const clientName = clientMap.get(sale.clienteId) || 'Cliente não encontrado';
        const productName = productMap.get(sale.produtoId) || 'Produto não encontrado';
        const saleDate = new Date(sale.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

        tableBody.innerHTML += `
             <tr>
                <td>${saleDate}</td>
                <td>${clientName}</td>
                <td>${productName}</td>
                <td>${sale.quantidade}</td>
                <td>${sale.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td>${sale.formaPagamento}</td>
                <td><span class="badge ${statusBadge} badge-ghost">${sale.status}</span></td>
                <td class="space-x-2">
                    <button class="btn btn-xs btn-outline btn-info edit-sale-btn" data-id="${sale.id}"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn btn-xs btn-outline btn-error delete-sale-btn" data-id="${sale.id}"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function renderDashboard() {
    const vendas = db.getAll('vendas');
    const produtos = db.getAll('produtos');
    const clientes = db.getAll('clientes');

    const totalRecebido = vendas.filter(v => v.status === 'Pago').reduce((sum, v) => sum + v.valorTotal, 0);
    const totalAReceber = vendas.filter(v => v.status === 'A pagar').reduce((sum, v) => sum + v.valorTotal, 0);

    document.getElementById('total-recebido').textContent = totalRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('total-a-receber').textContent = totalAReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('n-vendas').textContent = vendas.length;

    // Tabela de clientes a pagar
    const clientesAPagarTable = document.querySelector('#clientes-a-pagar-table tbody');
    clientesAPagarTable.innerHTML = '';
    clientes.filter(c => c.status === 'A pagar').forEach(c => {
        clientesAPagarTable.innerHTML += `<tr><td>${c.nome}</td><td>${c.telefone}</td></tr>`
    });

    // Gráfico de Vendas por Produto
    const vendasPorProduto = vendas.reduce((acc, venda) => {
        const produto = produtos.find(p => p.id === venda.produtoId);
        if (produto) {
            acc[produto.nome] = (acc[produto.nome] || 0) + venda.valorTotal;
        }
        return acc;
    }, {});

    const chartLabels = Object.keys(vendasPorProduto);
    const chartData = Object.values(vendasPorProduto);

    const ctx = document.getElementById('vendas-produto-chart').getContext('2d');
    if (vendasProdutoChart) {
        vendasProdutoChart.destroy();
    }
    vendasProdutoChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Total Vendido',
                data: chartData,
                backgroundColor: [
                    '#2563eb', '#f97316', '#16a34a', '#facc15', '#9333ea', '#db2777'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
        }
    });
}


// Navegação
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(pageId)?.classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${pageId}`) {
            link.classList.add('active');
        }
    });
}

function handleNavigation() {
    const pageId = window.location.hash.substring(1) || 'dashboard';
    showPage(pageId);

    if (pageId === 'dashboard') renderDashboard();
    if (pageId === 'clientes') renderClients();
    if (pageId === 'produtos') renderProducts();
    if (pageId === 'fornecedores') renderSuppliers();
    if (pageId === 'vendas') renderSales();
}

// Lógica de Formulários
function setupClientForm() {
    const form = document.getElementById('client-form');
    const modal = document.getElementById('client_modal');
    const modalTitle = document.getElementById('client-modal-title');
    const saveBtn = document.getElementById('save-client-btn');
    const idField = document.getElementById('client-id');

    saveBtn.onclick = () => {
        if (form.checkValidity()) {
            const clientData = {
                id: idField.value ? parseInt(idField.value) : undefined,
                nome: document.getElementById('client-name').value,
                email: document.getElementById('client-email').value,
                telefone: document.getElementById('client-phone').value,
                status: document.getElementById('client-status').value,
            };
            db.save('clientes', clientData);
            renderClients();
            modal.close();
            form.reset();
        } else {
            form.reportValidity();
        }
    };

    // Resetar formulário ao abrir para "Novo Cliente"
    const novoClienteBtn = document.querySelector('button[onclick="client_modal.showModal()"]');
    novoClienteBtn.addEventListener('click', () => {
        form.reset();
        idField.value = '';
        modalTitle.textContent = 'Novo Cliente';
    });
}

function setupSaleForm() {
    const form = document.getElementById('sale-form');
    const modal = document.getElementById('sale_modal');
    const modalTitle = document.getElementById('sale-modal-title');
    const saveBtn = document.getElementById('save-sale-btn');
    const idField = document.getElementById('sale-id');
    const clientSelect = document.getElementById('sale-client');
    const productSelect = document.getElementById('sale-product');
    const quantityInput = document.getElementById('sale-quantity');
    const totalInput = document.getElementById('sale-total');

    const products = db.getAll('produtos');

    function populateSelects() {
        const clients = db.getAll('clientes');
        clientSelect.innerHTML = '<option disabled selected>Selecione um cliente</option>';
        clients.forEach(c => clientSelect.innerHTML += `<option value="${c.id}">${c.nome}</option>`);

        productSelect.innerHTML = '<option disabled selected>Selecione um produto</option>';
        products.forEach(p => productSelect.innerHTML += `<option value="${p.id}">${p.nome}</option>`);
    }

    function calculateTotal() {
        const productId = productSelect.value;
        const quantity = quantityInput.value;
        if (productId && quantity > 0) {
            const product = products.find(p => p.id == productId);
            if (product) {
                const total = product.preco * quantity;
                totalInput.value = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }
        } else {
            totalInput.value = 'R$ 0,00';
        }
    }

    productSelect.addEventListener('change', calculateTotal);
    quantityInput.addEventListener('input', calculateTotal);

    saveBtn.onclick = () => {
        if (form.checkValidity()) {
            const productId = parseInt(productSelect.value);
            const product = products.find(p => p.id === productId);
            const totalValue = product.preco * parseInt(quantityInput.value);

            const saleData = {
                id: idField.value ? parseInt(idField.value) : undefined,
                clienteId: parseInt(document.getElementById('sale-client').value),
                produtoId: productId,
                quantidade: parseInt(document.getElementById('sale-quantity').value),
                valorTotal: totalValue,
                formaPagamento: document.getElementById('sale-payment').value,
                status: document.getElementById('sale-status').value,
            };

            const existingSale = idField.value ? db.getById('vendas', parseInt(idField.value)) : null;
            if (existingSale) {
                saleData.data = existingSale.data;
            }

            db.save('vendas', saleData);
            renderSales();
            renderDashboard();
            modal.close();
        } else {
            form.reportValidity();
        }
    };

    const novoVendaBtn = document.querySelector('button[onclick="sale_modal.showModal()"]');
    novoVendaBtn.addEventListener('click', () => {
        form.reset();
        idField.value = '';
        modalTitle.textContent = 'Nova Venda';
        totalInput.value = 'R$ 0,00';
        populateSelects();
    });

    document.getElementById('close-sale-modal-btn').addEventListener('click', () => form.reset());
}

function setupProductForm() {
    const form = document.getElementById('produto-form');
    const modal = document.getElementById('produto_modal');
    const modalTitle = document.getElementById('produto-modal-title');
    const saveBtn = document.getElementById('save-produto-btn');
    const idField = document.getElementById('produto-id');

    saveBtn.onclick = () => {
        if (form.checkValidity()) {
            const productData = {
                id: idField.value ? parseInt(idField.value) : undefined,
                nome: document.getElementById('produto-nome').value,
                codigo: document.getElementById('produto-codigo').value,
                descricao: document.getElementById('produto-descricao').value,
                preco: parseFloat(document.getElementById('produto-preco').value),
                estoque: parseInt(document.getElementById('produto-estoque').value),
            };
            db.save('produtos', productData);
            renderProducts();
            modal.close();
            form.reset();
        } else {
            form.reportValidity();
        }
    };

    // Resetar formulário ao abrir para "Novo Produto"
    const novoProdutoBtn = document.querySelector('button[onclick="produto_modal.showModal()"]');
    novoProdutoBtn.addEventListener('click', () => {
        form.reset();
        idField.value = '';
        modalTitle.textContent = 'Novo Produto';
    });
}

function setupSupplierForm() {
    const form = document.getElementById('fornecedor-form');
    const modal = document.getElementById('fornecedor_modal');
    const modalTitle = document.getElementById('fornecedor-modal-title');
    const saveBtn = document.getElementById('save-fornecedor-btn');
    const idField = document.getElementById('fornecedor-id');

    saveBtn.onclick = () => {
        if (form.checkValidity()) {
            const supplierData = {
                id: idField.value ? parseInt(idField.value) : undefined,
                nome: document.getElementById('fornecedor-nome').value,
                cnpj: document.getElementById('fornecedor-cnpj').value,
                contato: document.getElementById('fornecedor-contato').value,
                produtos: document.getElementById('fornecedor-produtos').value,
            };
            db.save('fornecedores', supplierData);
            renderSuppliers();
            modal.close();
            form.reset();
        } else {
            form.reportValidity();
        }
    };

    // Resetar formulário ao abrir para "Novo Fornecedor"
    const novoFornecedorBtn = document.querySelector('button[onclick="fornecedor_modal.showModal()"]');
    novoFornecedorBtn.addEventListener('click', () => {
        form.reset();
        idField.value = '';
        modalTitle.textContent = 'Novo Fornecedor';
    });
}

function generateSalesReportPDF(clientId = null) {
    const doc = new jsPDF();
    const sales = db.getAll("vendas");
    const clients = db.getAll("clientes");
    const products = db.getAll("produtos");
    const productMap = new Map(products.map(p => [p.id, p.nome]));

    // Se um ID de cliente foi fornecido, gera o relatório específico
    if (clientId) {
        const client = clients.find(c => c.id === clientId);
        if (!client) {
            alert('Cliente não encontrado!');
            return;
        }

        const clientSales = sales.filter(sale => sale.clienteId === clientId);
        const totalPaid = clientSales.filter(s => s.status === 'Pago').reduce((sum, s) => sum + s.valorTotal, 0);
        const totalDue = clientSales.filter(s => s.status === 'A pagar').reduce((sum, s) => sum + s.valorTotal, 0);

        doc.setFontSize(18);
        doc.text(`Relatório de Vendas - ${client.nome}`, 14, 22);
        doc.setFontSize(11);
        doc.text(`Email: ${client.email || 'N/A'}`, 14, 30);
        doc.text(`Telefone: ${client.telefone || 'N/A'}`, 14, 36);

        const tableColumn = ["Data", "Produto", "Qtd", "Valor", "Status"];
        const tableRows = clientSales.map(sale => [
            new Date(sale.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
            productMap.get(sale.produtoId) || 'Produto não encontrado',
            sale.quantidade,
            sale.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            sale.status
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
        });

        let finalY = doc.lastAutoTable.finalY || 60;
        doc.setFontSize(12);
        doc.text(`Total Pago: ${totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, finalY + 10);
        doc.text(`Total a Pagar: ${totalDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, finalY + 17);
        
        doc.save(`relatorio_${client.nome.replace(/\s/g, '_')}.pdf`);

    } else {
        // Comportamento antigo: Relatório geral de todos os clientes
        doc.setFontSize(18);
        doc.text('Relatório Geral de Vendas por Cliente', 14, 22);

        const clientSalesSummary = clients.map(client => {
            const clientSales = sales.filter(sale => sale.clienteId === client.id);
            const paidAmount = clientSales.filter(s => s.status === 'Pago').reduce((sum, s) => sum + s.valorTotal, 0);
            const dueAmount = clientSales.filter(s => s.status === 'A pagar').reduce((sum, s) => sum + s.valorTotal, 0);
            return { name: client.nome, paid: paidAmount, due: dueAmount };
        });

        const tableColumn = ["Cliente", "Total Pago", "Total a Pagar"];
        const tableRows = clientSalesSummary.map(client => [
            client.name,
            client.paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            client.due.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 30,
        });
        doc.save('relatorio_geral_vendas.pdf');
    }
}

function setupEventListeners() {
    window.addEventListener('hashchange', handleNavigation);

    // Event Listeners para botões de Clientes (Editar/Deletar)
document.getElementById('download-sales-pdf').addEventListener('click', () => {
        const clients = db.getAll('clientes');
        const select = document.getElementById('report-client-select');
        
        // Limpa opções antigas, mantendo a primeira
        select.innerHTML = '<option disabled selected value="">Escolha um cliente</option>';

        // Popula o select com os clientes
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.nome;
            select.appendChild(option);
        });

        // Abre o modal
        report_client_modal.showModal();
    });

    // Listener para o botão "Gerar PDF" dentro do modal
    document.getElementById('generate-selected-client-report-btn').addEventListener('click', () => {
        const select = document.getElementById('report-client-select');
        const selectedClientId = parseInt(select.value);

        if (selectedClientId) {
            generateSalesReportPDF(selectedClientId);
            report_client_modal.close(); // Fecha o modal após gerar
        } else {
            alert('Por favor, selecione um cliente para gerar o relatório.');
        }
    });

    document.getElementById('clientes-table').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const id = parseInt(btn.dataset.id);
        if (btn.classList.contains('delete-client-btn')) {
            if (confirm('Tem certeza que deseja excluir este cliente?')) {
                db.remove('clientes', id);
                renderClients();
            }
        } else if (btn.classList.contains('edit-client-btn')) {
            const client = db.getById('clientes', id);
            document.getElementById('client-id').value = client.id;
            document.getElementById('client-name').value = client.nome;
            document.getElementById('client-email').value = client.email;
            document.getElementById('client-phone').value = client.telefone;
            document.getElementById('client-status').value = client.status;
            document.getElementById('client-modal-title').textContent = 'Editar Cliente';
            document.getElementById('client_modal').showModal();
        }
    });

    // Event Listeners para botões de Produtos (Editar/Deletar)
    document.getElementById('produtos-table').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const id = parseInt(btn.dataset.id);
        if (btn.classList.contains('delete-product-btn')) {
            if (confirm('Tem certeza que deseja excluir este produto?')) {
                db.remove('produtos', id);
                renderProducts();
            }
        } else if (btn.classList.contains('edit-product-btn')) {
            const product = db.getById('produtos', id);
            document.getElementById('produto-id').value = product.id;
            document.getElementById('produto-nome').value = product.nome;
            document.getElementById('produto-codigo').value = product.codigo;
            document.getElementById('produto-descricao').value = product.descricao;
            document.getElementById('produto-preco').value = product.preco;
            document.getElementById('produto-estoque').value = product.estoque;
            document.getElementById('produto-modal-title').textContent = 'Editar Produto';
            document.getElementById('produto_modal').showModal();
        }
    });

    // Event Listeners para botões de Fornecedores (Editar/Deletar)
    document.getElementById('fornecedores-table').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const id = parseInt(btn.dataset.id);
        if (btn.classList.contains('delete-supplier-btn')) {
            if (confirm('Tem certeza que deseja excluir este fornecedor?')) {
                db.remove('fornecedores', id);
                renderSuppliers();
            }
        } else if (btn.classList.contains('edit-supplier-btn')) {
            const supplier = db.getById('fornecedores', id);
            document.getElementById('fornecedor-id').value = supplier.id;
            document.getElementById('fornecedor-nome').value = supplier.nome;
            document.getElementById('fornecedor-cnpj').value = supplier.cnpj;
            document.getElementById('fornecedor-contato').value = supplier.contato;
            document.getElementById('fornecedor-produtos').value = supplier.produtos;
            document.getElementById('fornecedor-modal-title').textContent = 'Editar Fornecedor';
            document.getElementById('fornecedor_modal').showModal();
        }
    });

    // Event Listeners para botões de Vendas (Editar/Deletar/Limpar/PDF)
    document.getElementById('vendas-table').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const id = parseInt(btn.dataset.id);
        if (btn.classList.contains('delete-sale-btn')) {
            if (confirm('Tem certeza que deseja excluir esta venda?')) {
                db.remove('vendas', id);
                renderSales();
                renderDashboard();
            }
        } else if (btn.classList.contains('edit-sale-btn')) {
            const sale = db.getById('vendas', id);
            setupSaleForm(); // Popula os selects
            document.getElementById('sale-id').value = sale.id;
            document.getElementById('sale-client').value = sale.clienteId;
            document.getElementById('sale-product').value = sale.produtoId;
            document.getElementById('sale-quantity').value = sale.quantidade;
            document.getElementById('sale-payment').value = sale.formaPagamento;
            document.getElementById('sale-status').value = sale.status;
            document.getElementById('sale-total').value = sale.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            document.getElementById('sale-modal-title').textContent = 'Editar Venda';
            document.getElementById('sale_modal').showModal();
        }
    });

    document.getElementById('clear-sales-btn').addEventListener('click', () => {
        if (confirm('ATENÇÃO: Isso apagará TODAS as vendas permanentemente. Deseja continuar?')) {
            db._dangerouslyClearTable('vendas');
            renderSales();
            renderDashboard();
        }
    });

    document.getElementById('download-sales-pdf').addEventListener('click', generateSalesReportPDF);
}


// Inicialização
function init() {
    if (!checkAuth()) {
        showLoginPage();
    } else {
        showAppPage();
        db.init();
        window.location.hash = '#dashboard';
        handleNavigation();
        setupClientForm();
        setupProductForm();
        setupSupplierForm();
        setupSaleForm();
        setupEventListeners();
    }
}

function showLoginPage() {
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('signup-page').classList.add('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

function showSignupPage() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('signup-page').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

function showAppPage() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('signup-page').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
}

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (login(user, pass)) {
        init();
    } else {
        alert('Usuário ou senha inválidos!');
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    logout();
    init();
});

document.getElementById('show-signup-btn').addEventListener('click', showSignupPage);
document.getElementById('show-login-btn').addEventListener('click', showLoginPage);


init();