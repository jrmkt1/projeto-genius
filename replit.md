# Overview

This is a Product Inventory Management System (Sistema de Controle e Cadastro de Produtos) built as a full-stack web application with Flask backend and PostgreSQL database. The system allows users to add, edit, delete, and view product inventory with details including product code, quantity, description, packaging, and unit price. Additionally, it features a complete stock movement tracking system (entrada/saída) with history and filtering capabilities. The application is designed for Brazilian Portuguese users and uses PostgreSQL database for permanent, centralized data storage accessible from any device.

## Recent Changes (November 6, 2025)
- **ADDED EDIT AND DELETE FUNCTIONALITY FOR MOVEMENTS**
- Users can now edit existing stock movements (entrada/saída)
- Users can delete movements with automatic stock recalculation
- Edit button fills form with movement data for modification
- Backend validates stock availability when editing/deleting to prevent negative inventory
- Added PUT and DELETE endpoints for /api/movimentacoes/:id
- Movement table now includes "Ações" column with Edit/Delete buttons
- Stock automatically adjusts when movements are edited or deleted

## Previous Changes (October 24, 2025)
- **ADDED PRODUCT DESCRIPTION to Movements Table**
- Movement history now shows full product name/description alongside product code
- Table columns: Date/Time | Code | **Description** | Estoque Inicial | Type | Quantity | Estoque Após | Observation | **Ações**
- Improves readability by showing full product information without needing to cross-reference
- **ADDED ESTOQUE INICIAL (Initial Stock) Column to Movements Table**
- New column "Estoque Inicial" shows the original stock from PDF quotation (COTAÇÃO GENIOS 30.09.2025)
- Database migration: Added estoque_inicial field to produtos table
- Updated Movimentacao.to_dict() to include estoqueInicial in API responses
- Initial stock values populated from quotation: 6190-G (3000), 2029-G (1500), 2028-G (1800), 8318-G (2000), 6159-G (3000)

## Previous Changes (October 20, 2025)
- **CONFIGURAÇÃO DE PRODUÇÃO CORRIGIDA**
- Deploy configurado com Gunicorn para produção (autoscale)
- Validação de DATABASE_URL com mensagens de erro claras
- Tratamento de erro robusto na inicialização do banco
- Endpoint /health para verificação de status do servidor
- Inicialização automática de produtos quando banco está vazio
- Sistema 100% pronto para deploy/publish em produção

## Previous Changes (October 16, 2025)
- **MIGRATED TO DATABASE: Sistema agora usa PostgreSQL ao invés de localStorage**
- Implementado backend Flask com API REST completa
- Criadas tabelas de produtos e movimentações no PostgreSQL
- Todos os dados agora são permanentes e centralizados
- Múltiplos usuários podem acessar os mesmos dados
- Proteção contra race conditions com row-level locking
- Dados nunca são perdidos, mesmo limpando o navegador
- **ATUALIZADO: Base de dados com produtos da COTAÇÃO GENIOS 30.09.2025**
- Carregados 5 produtos FORTRAL: DUPLAF, EXTRAFLEX (Azul/Laranja), Luxo Jardim, e Suprema

## Previous Changes (October 15, 2025)
- Initial system implementation completed
- Fixed critical bug in search/filter functionality where edit/delete actions referenced wrong products when filters were active
- Implemented originalIndex tracking using indexOf() to ensure correct CRUD operations regardless of filter state
- **Added complete stock movement system with entrada (entry) and saída (exit) tracking**
- Implemented tab-based navigation between Products and Movements sections
- Created movement history with datetime stamps, type badges, and observation notes
- Added automatic stock quantity updates based on movement registrations
- Implemented movement filtering by type (all/entrada/saída)
- Added stock validation to prevent negative quantities on exits
- **Updated brand identity to Comercial Genius with teal/turquoise color scheme**
- Integrated Comercial Genius logo in header
- Changed color palette from purple to teal (#17a2b8 to #0d7377 gradient) throughout entire UI
- **Added comprehensive Reports tab with product and movement report generation**
- Implemented product stock report showing all items with quantities, values, and totals
- Implemented movement history report with complete transaction details
- Added print functionality using window.print() with dedicated @media print CSS styles
- Print reports include clean layout with company branding and formatted data tables
- Reports automatically calculate and display summary statistics (totals, quantities, values)
- **Redesigned layout to eliminate page scrollbars**
- Implemented viewport-height (100vh) based layout using flexbox
- Added internal scrolling only for tables and form content
- Optimized spacing and padding for full-screen display
- Fixed print styles to support multi-page reports without clipping

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Single-Page Application (SPA) Pattern**
- Pure JavaScript class-based architecture with no framework dependencies
- ProductManager class handles all business logic and state management
- DOM manipulation for dynamic UI updates
- Responsive design using CSS Grid for adaptive layouts

**Data Management**
- Server-side persistence with PostgreSQL database
- Client-side state management through JavaScript class properties
- API communication using async/await fetch() calls
- Real-time data synchronization between database and UI
- Edit mode tracking via database ID reference

**UI/UX Design Decisions**
- Gradient teal/turquoise background (#17a2b8 to #0d7377) matching Comercial Genius brand identity
- Comercial Genius logo displayed in header (max-width: 150px, compact)
- Card-based layout with white panels for content separation
- Two-column grid layout (380px form sidebar + flexible table area)
- Mobile-responsive with single-column fallback below 1024px breakpoint
- Form validation using HTML5 required attributes
- Consistent teal color scheme across buttons, tabs, tables, and interactive elements
- **No-scroll viewport design**: 100vh layout with internal scrolling only for tables/forms
- Optimized spacing for full-screen display without page scrollbars
- Sticky table headers for better navigation in scrollable areas

## Data Storage Solutions

**PostgreSQL Database Implementation**
- Backend: Flask + SQLAlchemy ORM
- Database: PostgreSQL (Replit managed)
- RESTful API for all CRUD operations
- Centralized data storage accessible from anywhere
- Automatic database initialization with seed data
- Row-level locking to prevent race conditions
- Cascade deletes (movements deleted when product is deleted)

**Database Schema**
- **produtos** table: id, codigo (unique), quantidade, estoque_inicial, descricao, embalagem, valor, created_at, updated_at
- **movimentacoes** table: id, produto_id (FK), tipo, quantidade, estoque_apos, observacao, data
- Relationship: One product has many movements (1:N)
- Decimal precision for monetary values (Numeric 10,2)
- Integer quantities for inventory counts
- ISO datetime stamps for all movement records
- estoque_inicial stores original stock from PDF quotation (nullable for backwards compatibility)

## Backend Dependencies

**Python Backend (Flask)**
- Flask 3.1.2 - Web framework
- Flask-CORS 6.0.1 - Cross-origin resource sharing
- Flask-SQLAlchemy 3.1.1 - ORM for database
- SQLAlchemy 2.0.44 - SQL toolkit
- psycopg2-binary 2.9.11 - PostgreSQL adapter

**Frontend**
- Pure HTML5, CSS3, and vanilla JavaScript
- No frontend frameworks (React, Vue, Angular)
- No frontend libraries (jQuery, Lodash)
- No build tools required

**Browser APIs Used**
- Fetch API for HTTP requests
- DOM API for UI manipulation and event handling
- HTML5 Form Validation API

**Initial Data Source**
- Products from "COTAÇÃO GENIOS 30.09.2025.pdf" - 5 FORTRAL brand industrial hoses/mangueiras
- Seed data includes: DUPLAF VD FOSCA, EXTRAFLEX (Azul/Laranja), Luxo Jardim Verde Fosca, Suprema Vermelha
- Automatic database initialization on first run with real quotation data